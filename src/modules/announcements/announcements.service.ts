import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppCacheService } from '../../common/cache/app-cache.service.js';
import { CACHE_NS } from '../../common/cache/cache-namespaces.js';
import { ApplicationStatus, Role } from '../../common/enums/index.js';
import { paginated, toSkipTake } from '../../common/pagination/index.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProgramsService } from '../programs/programs.service.js';
import { CreateAnnouncementDto } from './dto/create-announcement.dto.js';
import { ListAnnouncementsDto } from './dto/list-announcements.dto.js';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto.js';

const CACHE_TTL = 5 * 60_000;

const SELECT = {
  id: true,
  title: true,
  content: true,
  isGeneral: true,
  createdAt: true,
  program: { select: { id: true, title: true } },
  author: { select: { id: true, fullName: true, role: true } },
} satisfies Prisma.AnnouncementSelect;

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly programs: ProgramsService,
    private readonly cache: AppCacheService,
  ) {}

  async create(user: AuthUser, dto: CreateAnnouncementDto, imageUrl?: string) {
  try {
    if (dto.programId === undefined) {
      if (user.role !== Role.ADMIN) throw new ForbiddenException('Only admins can publish general announcements');
    } else {
      await this.programs.assertCanManage(dto.programId, user);
    }
    
    const a = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        content: dto.content,
        programId: dto.programId ? Number(dto.programId) : null,
        isGeneral: dto.programId === undefined,
        authorId: user.id,
       
      },
      select: SELECT,
    });
    
    await this.cache.invalidate(CACHE_NS.ANNOUNCEMENTS);
    return a;
  } catch (error) {
    console.error('ERROR IN ANNOUNCEMENT CREATE:', error); 
    throw error;
  }
}

  
  general(q: ListAnnouncementsDto) {
    return this.cache.remember(CACHE_NS.ANNOUNCEMENTS, `general:${q.page}:${q.limit}:${q.search ?? ''}`, CACHE_TTL, () =>
      this.page({ isGeneral: true, ...this.searchWhere(q.search) }, q),
    );
  }

  /** إعلانات برنامج معين (cached بعد فحص الصلاحية) */
  async byProgram(programId: number, user: AuthUser, q: ListAnnouncementsDto) {
    await this.programs.assertCanViewContent(programId, user);
    return this.cache.remember(
      CACHE_NS.ANNOUNCEMENTS,
      `program:${programId}:${q.page}:${q.limit}:${q.search ?? ''}`,
      CACHE_TTL,
      () => this.page({ programId, ...this.searchWhere(q.search) }, q),
    );
  }

  /**
   * "تغذيتي": العامة + الخاصة بالبرامج يلي أنا مقبول فيها (شاب) أو يلي أنا مشرف عليها (مشرف).
   * بدون cache لأنها بتتغير حسب حالة طلب كل شاب.
   */
  my(user: AuthUser, q: ListAnnouncementsDto) {
    const scope: Prisma.AnnouncementWhereInput =
      user.role === Role.SUPERVISOR
        ? { OR: [{ isGeneral: true }, { program: { supervisorId: user.id } }] }
        : {
            OR: [
              { isGeneral: true },
              { program: { applications: { some: { userId: user.id, status: ApplicationStatus.ACCEPTED } } } },
            ],
          };
    return this.page({ AND: [scope, this.searchWhere(q.search)] }, q);
  }

  async update(id: number, user: AuthUser, dto: UpdateAnnouncementDto) {
    await this.assertCanModify(id, user);
    const a = await this.prisma.announcement.update({ where: { id }, data: dto, select: SELECT });
    await this.cache.invalidate(CACHE_NS.ANNOUNCEMENTS);
    return a;
  }

  async remove(id: number, user: AuthUser) {
    await this.assertCanModify(id, user);
    await this.prisma.announcement.delete({ where: { id } });
    await this.cache.invalidate(CACHE_NS.ANNOUNCEMENTS);
    return { message: 'Announcement deleted' };
  }

  /** الأدمن على أي إعلان، المشرف على إعلاناته هو + ضمن برنامج لسا مسؤول عنه */
  private async assertCanModify(id: number, user: AuthUser) {
    const a = await this.prisma.announcement.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Announcement not found');
    if (user.role === Role.ADMIN) return a;
    if (a.authorId !== user.id || !a.programId) throw new ForbiddenException('You can only modify your own announcements');
    await this.programs.assertCanManage(a.programId, user);
    return a;
  }

  private searchWhere(search?: string): Prisma.AnnouncementWhereInput {
    return search
      ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { content: { contains: search, mode: 'insensitive' } }] }
      : {};
  }

  private async page(where: Prisma.AnnouncementWhereInput, q: ListAnnouncementsDto) {
    const [total, data] = await Promise.all([
      this.prisma.announcement.count({ where }),
      this.prisma.announcement.findMany({ where, select: SELECT, orderBy: { createdAt: 'desc' }, ...toSkipTake(q) }),
    ]);
    return paginated(data, total, q);
  }
}
