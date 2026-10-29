import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppCacheService } from '../../common/cache/app-cache.service.js';
import { CACHE_NS } from '../../common/cache/cache-namespaces.js';
import { ApplicationStatus, Role } from '../../common/enums/index.js';
import { paginated, toSkipTake } from '../../common/pagination/index.js';
import { StorageService } from '../../common/upload/storage.service.js';
import { storedPath } from '../../common/upload/upload.config.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateProgramDto } from './dto/create-program.dto.js';
import { ListProgramsDto } from './dto/list-programs.dto.js';
import { UpdateProgramDto } from './dto/update-program.dto.js';

const CACHE_TTL = 5 * 60_000;

// يلي بيشوفه الشاب بكل برنامج: وصف + صورة + اسم المشرف + المقاعد المتبقية + مواعيد الجلسات
const PROGRAM_INCLUDE = {
  supervisor: { select: { id: true, fullName: true } },
  courseSessions: { orderBy: [{ date: 'asc' }, { time: 'asc' }] },
} satisfies Prisma.ProgramInclude;

@Injectable()
export class ProgramsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AppCacheService,
    private readonly storage: StorageService,
  ) {}

  // ---------- قراءة ----------
  list(q: ListProgramsDto) {
    return this.cache.remember(CACHE_NS.PROGRAMS, `list:${q.page}:${q.limit}:${q.search ?? ''}`, CACHE_TTL, () =>
      this.query(this.searchWhere(q.search), q),
    );
  }

  mine(user: AuthUser, q: ListProgramsDto) {
    return this.query({ ...this.searchWhere(q.search), supervisorId: user.id }, q);
  }

  findOne(id: number) {
    return this.cache.remember(CACHE_NS.PROGRAMS, `one:${id}`, CACHE_TTL, async () => {
      const program = await this.prisma.program.findUnique({ where: { id }, include: PROGRAM_INCLUDE });
      if (!program) throw new NotFoundException('Program not found');
      return program;
    });
  }

  private searchWhere(search?: string): Prisma.ProgramWhereInput {
    return search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
  }

  private async query(where: Prisma.ProgramWhereInput, q: ListProgramsDto) {
    const [total, data] = await Promise.all([
      this.prisma.program.count({ where }),
      this.prisma.program.findMany({
        where,
        include: PROGRAM_INCLUDE,
        orderBy: { id: 'desc' },
        ...toSkipTake(q),
      }),
    ]);
    return paginated(data, total, q);
  }

  // ---------- كتابة ----------
  async create(user: AuthUser, dto: CreateProgramDto, image?: Express.Multer.File) {
    const supervisorId = await this.resolveSupervisor(user, dto.supervisorId, true);
    const program = await this.prisma.program.create({
      data: {
        title: dto.title,
        description: dto.description,
        totalSeats: dto.totalSeats,
        availableSeats: dto.totalSeats,
        supervisorId: supervisorId!,
        imageUrl: image ? storedPath('image', image) : null,
      },
      include: PROGRAM_INCLUDE,
    });
    await this.cache.invalidate(CACHE_NS.PROGRAMS);
    return program;
  }

  async update(id: number, user: AuthUser, dto: UpdateProgramDto, image?: Express.Multer.File) {
    const program = await this.assertCanManage(id, user);
    const supervisorId = await this.resolveSupervisor(user, dto.supervisorId, false);

    const data: Prisma.ProgramUncheckedUpdateManyInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (supervisorId !== undefined && user.role === Role.ADMIN) data.supervisorId = supervisorId;
    if (image) data.imageUrl = storedPath('image', image);

    // تغيير عدد المقاعد: ذرّي، وما بيسمح ينزل تحت عدد المقاعد المحجوزة
    if (dto.totalSeats !== undefined && dto.totalSeats !== program.totalSeats) {
      const delta = dto.totalSeats - program.totalSeats;
      const r = await this.prisma.program.updateMany({
        where: { id, totalSeats: program.totalSeats, availableSeats: { gte: Math.max(0, -delta) } },
        data: { ...data, totalSeats: dto.totalSeats, availableSeats: { increment: delta } },
      });
      if (r.count === 0) {
        throw new ConflictException('Cannot reduce seats below the number already reserved (or seats changed concurrently)');
      }
    } else if (Object.keys(data).length) {
      await this.prisma.program.update({ where: { id }, data });
    }

    if (image) await this.storage.remove(program.imageUrl); // بعد النجاح بنمسح الصورة القديمة
    await this.cache.invalidate(CACHE_NS.PROGRAMS);
    return this.prisma.program.findUniqueOrThrow({ where: { id }, include: PROGRAM_INCLUDE });
  }

  async remove(id: number, user: AuthUser) {
    const program = await this.assertCanManage(id, user);
    const [materials, applications] = await Promise.all([
      this.prisma.material.findMany({ where: { programId: id }, select: { fileUrl: true } }),
      this.prisma.application.findMany({ where: { programId: id, cvUrl: { not: null } }, select: { cvUrl: true } }),
    ]);
    await this.prisma.program.delete({ where: { id } }); // الجلسات والطلبات والمواد والإعلانات بتنحذف cascade
    await Promise.all([
      this.storage.remove(program.imageUrl),
      ...materials.map((m) => this.storage.remove(m.fileUrl)),
      ...applications.map((a) => this.storage.remove(a.cvUrl)),
    ]);
    await this.cache.invalidate(CACHE_NS.PROGRAMS);
    await this.cache.invalidate(CACHE_NS.ANNOUNCEMENTS);
    return { message: 'Program deleted' };
  }

  // ---------- صلاحيات (بتستخدمها باقي الـ modules) ----------
  /** الأدمن أو المشرف المسؤول عن البرنامج فقط. بيرجع البرنامج. */
  async assertCanManage(programId: number, user: AuthUser) {
    const program = await this.prisma.program.findUnique({ where: { id: programId } });
    if (!program) throw new NotFoundException('Program not found');
    if (user.role === Role.ADMIN) return program;
    if (user.role === Role.SUPERVISOR && program.supervisorId === user.id) return program;
    throw new ForbiddenException('You can only manage your own programs');
  }

  /** عرض محتوى البرنامج (مواد/إعلانات): أدمن، المشرف المسؤول، أو شاب مقبول بالبرنامج */
  async assertCanViewContent(programId: number, user: AuthUser) {
    const program = await this.prisma.program.findUnique({ where: { id: programId } });
    if (!program) throw new NotFoundException('Program not found');
    if (user.role === Role.ADMIN) return program;
    if (user.role === Role.SUPERVISOR && program.supervisorId === user.id) return program;
    if (user.role === Role.YOUTH) {
      const accepted = await this.prisma.application.findFirst({
        where: { programId, userId: user.id, status: ApplicationStatus.ACCEPTED },
        select: { id: true },
      });
      if (accepted) return program;
    }
    throw new ForbiddenException('Only accepted participants can access this content');
  }

  private async resolveSupervisor(user: AuthUser, requested: number | undefined, required: boolean) {
    if (user.role === Role.SUPERVISOR) return user.id;
    if (requested === undefined) {
      if (required) throw new BadRequestException('supervisorId is required when an admin creates a program');
      return undefined;
    }
    const sup = await this.prisma.user.findUnique({ where: { id: requested }, select: { role: true } });
    if (!sup || sup.role !== Role.SUPERVISOR) throw new BadRequestException('supervisorId must belong to a supervisor');
    return requested;
  }
}
