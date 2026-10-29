import {
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
import type { AuthUser } from '../../common/types/auth-user.js';
import { StorageService } from '../../common/upload/storage.service.js';
import { storedPath } from '../../common/upload/upload.config.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../../queue/notifications/notifications.service.js';
import { ListApplicationsDto } from './dto/list-applications.dto.js';

const TX_OPTS = { maxWait: 10_000, timeout: 10_000 };

const APPLICATION_SELECT = {
  id: true,
  status: true,
  appliedAt: true,
  cvUrl: true,
  program: { select: { id: true, title: true, imageUrl: true, supervisorId: true } },
  user: { select: { id: true, fullName: true, email: true, phone: true } },
} satisfies Prisma.ApplicationSelect;

type ApplicationRow = Prisma.ApplicationGetPayload<{ select: typeof APPLICATION_SELECT }>;

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AppCacheService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
  ) {}

  /** ما بنكشف مسار الملف الداخلي، بس رابط التحميل (محمي بالصلاحيات) */
  private view({ cvUrl, ...rest }: ApplicationRow) {
    return { ...rest, cvDownloadUrl: cvUrl ? `/api/applications/${rest.id}/cv` : null };
  }

  /**
   * التقديم على برنامج — قلب المشروع (آخر مقعد):
   * كله داخل transaction واحدة، وحجز المقعد بـ UPDATE شرطي ذرّي:
   *   UPDATE programs SET availableSeats = availableSeats - 1 WHERE id = ? AND availableSeats > 0
   * Postgres بيعمل row-lock على سطر البرنامج، فالطلبات المتزامنة بتنتظر بالدور
   * وما بيمر منها أكتر من عدد المقاعد المتبقية. باقي الطلبات بياخدوا 409 واضح.
   * إذا صار تكرار (نفس الشاب/البرنامج) الـ transaction بتتراجع والمقعد بيرجع.
   */
  async apply(user: AuthUser, programId: number, cv?: Express.Multer.File) {
    const program = await this.prisma.program.findUnique({ where: { id: programId }, select: { id: true } });
    if (!program) throw new NotFoundException('Program not found');

    const existing = await this.prisma.application.findUnique({
      where: { userId_programId: { userId: user.id, programId } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('You have already applied to this program');

    const application = await this.prisma
      .$transaction(async (tx) => {
        const seat = await tx.program.updateMany({
          where: { id: programId, availableSeats: { gt: 0 } },
          data: { availableSeats: { decrement: 1 } },
        });
        if (seat.count === 0) throw new ConflictException('No seats available for this program');

        try {
          return await tx.application.create({
            data: { userId: user.id, programId, cvUrl: cv ? storedPath('cv', cv) : null },
            select: APPLICATION_SELECT,
          });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            throw new ConflictException('You have already applied to this program');
          }
          throw e;
        }
      }, TX_OPTS);

    await this.cache.invalidate(CACHE_NS.PROGRAMS); // المقاعد المتبقية تغيّرت
    return this.view(application);
  }

  async cancel(user: AuthUser, id: number) {
    const app = await this.prisma.application.findFirst({ where: { id, userId: user.id } });
    if (!app) throw new NotFoundException('Application not found');

    await this.prisma.$transaction(async (tx) => {
      const r = await tx.application.updateMany({
        where: { id, userId: user.id, status: { in: [ApplicationStatus.PENDING, ApplicationStatus.ACCEPTED] } },
        data: { status: ApplicationStatus.CANCELLED },
      });
      if (r.count === 0) throw new ConflictException(`Application is already ${app.status.toLowerCase()}`);
      await tx.program.update({ where: { id: app.programId }, data: { availableSeats: { increment: 1 } } });
    }, TX_OPTS);

    await this.cache.invalidate(CACHE_NS.PROGRAMS);
    return { message: 'Application cancelled' };
  }

  /** قرار الأدمن: PENDING → ACCEPTED | REJECTED. الرفض بيرجّع المقعد. */
  async decide(id: number, status: 'ACCEPTED' | 'REJECTED') {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: { user: { select: { fullName: true, email: true } }, program: { select: { title: true } } },
    });
    if (!app) throw new NotFoundException('Application not found');

    await this.prisma.$transaction(async (tx) => {
      const r = await tx.application.updateMany({
        where: { id, status: ApplicationStatus.PENDING },
        data: { status },
      });
      if (r.count === 0) throw new ConflictException('Only pending applications can be accepted or rejected');
      if (status === ApplicationStatus.REJECTED) {
        await tx.program.update({ where: { id: app.programId }, data: { availableSeats: { increment: 1 } } });
      }
    }, TX_OPTS);

    await this.cache.invalidate(CACHE_NS.PROGRAMS);
    this.notifications.applicationDecision({
      email: app.user.email,
      fullName: app.user.fullName,
      programTitle: app.program.title,
      status,
    });
    return { id, status };
  }

  // ---------- قراءة ----------
  /** طلباتي (الشاب بيشوف طلباته هو بس) */
  async mine(user: AuthUser, q: ListApplicationsDto) {
    const where: Prisma.ApplicationWhereInput = { userId: user.id, ...(q.status && { status: q.status }) };
    return this.page(where, q);
  }

  /** الأدمن: كل الطلبات. المشرف: طلبات برامجه فقط (قراءة). */
  async listAll(user: AuthUser, q: ListApplicationsDto) {
    const where: Prisma.ApplicationWhereInput = {
      ...(user.role === Role.SUPERVISOR && { program: { supervisorId: user.id } }),
      ...(q.status && { status: q.status }),
      ...(q.programId && { programId: q.programId }),
      ...(q.search && {
        user: {
          OR: [
            { fullName: { contains: q.search, mode: 'insensitive' } },
            { email: { contains: q.search, mode: 'insensitive' } },
          ],
        },
      }),
    };
    return this.page(where, q);
  }

  private async page(where: Prisma.ApplicationWhereInput, q: ListApplicationsDto) {
    const [total, rows] = await Promise.all([
      this.prisma.application.count({ where }),
      this.prisma.application.findMany({
        where,
        select: APPLICATION_SELECT,
        orderBy: { appliedAt: 'desc' },
        ...toSkipTake(q),
      }),
    ]);
    return paginated(rows.map((r) => this.view(r)), total, q);
  }

  /** تحميل الـ CV: صاحب الطلب، الأدمن، أو مشرف البرنامج */
  async downloadCv(user: AuthUser, id: number, res: { set: (h: Record<string, string>) => unknown }) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      select: { userId: true, cvUrl: true, program: { select: { supervisorId: true } }, user: { select: { fullName: true } } },
    });
    if (!app || !app.cvUrl) throw new NotFoundException('CV not found');

    const allowed =
      user.role === Role.ADMIN ||
      (user.role === Role.SUPERVISOR && app.program.supervisorId === user.id) ||
      (user.role === Role.YOUTH && app.userId === user.id);
    if (!allowed) throw new ForbiddenException('You cannot access this CV');

    return this.storage.download(app.cvUrl, res, `CV-${app.user.fullName}`);
  }
}
