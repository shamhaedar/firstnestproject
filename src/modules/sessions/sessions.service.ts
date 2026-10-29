import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export const REFRESH_TTL_DAYS = 7;

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: number, userAgent?: string) {
    return this.prisma.session.create({
      data: {
        userId,
        userAgent: userAgent?.slice(0, 255),
        refreshTokenHash: '',
        expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
  }

  findById(id: number) {
    return this.prisma.session.findUnique({ where: { id } });
  }

  /** الجلسة صالحة: موجودة، مو ملغاة، مو منتهية، وبتعود لنفس المستخدم */
  async isActive(sid: number, userId: number): Promise<boolean> {
    const s = await this.prisma.session.findUnique({ where: { id: sid } });
    return !!s && s.userId === userId && !s.revokedAt && s.expiresAt > new Date();
  }

  setHash(id: number, refreshTokenHash: string) {
    return this.prisma.session.update({ where: { id }, data: { refreshTokenHash } });
  }

  /** Rotation ذرّي: بينجح بس إذا الـ hash الحالي هو نفسه يلي أُرسل (يمنع استخدام refresh token مرتين) */
  async rotate(id: number, oldHash: string, newHash: string): Promise<boolean> {
    const r = await this.prisma.session.updateMany({
      where: { id, refreshTokenHash: oldHash, revokedAt: null },
      data: { refreshTokenHash: newHash },
    });
    return r.count === 1;
  }

  revoke(id: number) {
    return this.prisma.session.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  listActive(userId: number) {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userAgent: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeOwn(userId: number, id: number) {
    const r = await this.prisma.session.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (r.count === 0) throw new NotFoundException('Session not found');
    return { message: 'Session revoked' };
  }
}
