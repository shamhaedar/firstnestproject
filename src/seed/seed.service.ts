import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/enums/index.js';
import { PrismaService } from '../prisma/prisma.service.js';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Seed idempotent (بيشتغل عند كل تشغيل ومستحيل يكرر البيانات). بيعطّل بـ SEED_ON_BOOT=false.
 * حسابات الدخول التجريبية (كلمات المرور بالـ README):
 *   admin@sanad.local | supervisor1@sanad.local | supervisor2@sanad.local | youth1..youth20@sanad.local
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    if (this.config.get('SEED_ON_BOOT') === 'false') return;
    try {
      await this.seed();
    } catch (e: any) {
      this.logger.error(`Seeding failed: ${e?.message}`, e?.stack);
    }
  }

  private async user(fullName: string, email: string, role: Role, passwordHash: string, phone?: string) {
    return this.prisma.user.upsert({
      where: { email },
      update: {},
      create: { fullName, email, role, password: passwordHash, phone },
    });
  }

  async seed() {
    const adminPass = this.config.get('SEED_ADMIN_PASSWORD') ?? 'Admin@12345';
    const staffPass = 'Supervisor@12345';
    const youthPass = 'Youth@12345';
    const [adminHash, staffHash, youthHash] = await Promise.all(
      [adminPass, staffPass, youthPass].map((p) => bcrypt.hash(p, 10)),
    );

    const admin = await this.user('Sanad Admin', 'admin@sanad.local', Role.ADMIN, adminHash);
    const sup1 = await this.user('Rami Supervisor', 'supervisor1@sanad.local', Role.SUPERVISOR, staffHash);
    const sup2 = await this.user('Lina Supervisor', 'supervisor2@sanad.local', Role.SUPERVISOR, staffHash);
    for (let i = 1; i <= 20; i++) {
      await this.user(`Youth ${i}`, `youth${i}@sanad.local`, Role.YOUTH, youthHash);
    }

    const programs = [
      { title: 'Web Development Bootcamp', description: 'Hands-on training in HTML, CSS, JavaScript and Node.js.', seats: 25, supervisorId: sup1.id },
      { title: 'Public Speaking Workshop', description: 'Build confidence and learn to present your ideas clearly.', seats: 15, supervisorId: sup2.id },
      { title: 'Last Seat Demo', description: 'Program with ONE seat, used to demo the concurrent last-seat race.', seats: 1, supervisorId: sup1.id },
    ];
    for (const p of programs) {
      const exists = await this.prisma.program.findFirst({ where: { title: p.title } });
      if (exists) continue;
      await this.prisma.program.create({
        data: {
          title: p.title,
          description: p.description,
          totalSeats: p.seats,
          availableSeats: p.seats,
          supervisorId: p.supervisorId,
          courseSessions: {
            create: [1, 2, 3].map((n) => ({
              date: new Date(Date.now() + n * 7 * DAY),
              time: new Date(Date.now() + n * 7 * DAY + 10 * 60 * 60 * 1000),
              locationOrLink: n === 1 ? 'Youth Center - Hall A' : 'https://meet.example.com/sanad',
            })),
          },
        },
      });
    }

    if (!(await this.prisma.announcement.findFirst({ where: { isGeneral: true } }))) {
      await this.prisma.announcement.create({
        data: {
          title: 'Welcome to Youth Sanad',
          content: 'Browse the available programs and apply to the ones that fit you.',
          isGeneral: true,
          authorId: admin.id,
        },
      });
    }
    this.logger.log('Seed complete (admin@sanad.local, supervisor1/2@sanad.local, youth1..20@sanad.local)');
  }
}
