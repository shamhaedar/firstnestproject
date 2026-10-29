import { Injectable, NotFoundException } from '@nestjs/common';
import { AppCacheService } from '../../common/cache/app-cache.service.js';
import { CACHE_NS } from '../../common/cache/cache-namespaces.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProgramsService } from '../programs/programs.service.js';
import { CreateCourseSessionDto } from './dto/create-course-session.dto.js';
import { UpdateCourseSessionDto } from './dto/update-course-session.dto.js';

@Injectable()
export class CourseSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly programs: ProgramsService,
    private readonly cache: AppCacheService,
  ) {}

  async listByProgram(programId: number) {
    await this.programs.findOne(programId); // 404 إذا مو موجود
    return this.prisma.courseSession.findMany({
      where: { programId },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
  }

  async create(programId: number, user: AuthUser, dto: CreateCourseSessionDto) {
    await this.programs.assertCanManage(programId, user);
    const session = await this.prisma.courseSession.create({
      data: {
        programId,
        date: new Date(dto.date),
        time: new Date(dto.time),
        locationOrLink: dto.locationOrLink,
      },
    });
    await this.cache.invalidate(CACHE_NS.PROGRAMS);
    return session;
  }

  async update(id: number, user: AuthUser, dto: UpdateCourseSessionDto) {
    const existing = await this.getOrFail(id);
    await this.programs.assertCanManage(existing.programId, user);
    const session = await this.prisma.courseSession.update({
      where: { id },
      data: {
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.time && { time: new Date(dto.time) }),
        ...(dto.locationOrLink && { locationOrLink: dto.locationOrLink }),
      },
    });
    await this.cache.invalidate(CACHE_NS.PROGRAMS);
    return session;
  }

  async remove(id: number, user: AuthUser) {
    const existing = await this.getOrFail(id);
    await this.programs.assertCanManage(existing.programId, user);
    await this.prisma.courseSession.delete({ where: { id } });
    await this.cache.invalidate(CACHE_NS.PROGRAMS);
    return { message: 'Session deleted' };
  }

  private async getOrFail(id: number) {
    const s = await this.prisma.courseSession.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Session not found');
    return s;
  }
}
