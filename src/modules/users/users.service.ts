import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { paginated, toSkipTake } from '../../common/pagination/index.js';
import { ListUsersDto } from './dto/list-users.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

const SAFE = { id: true, fullName: true, email: true, role: true, phone: true, createdAt: true } as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ListUsersDto) {
    const where: Prisma.UserWhereInput = {
      ...(q.role && { role: q.role }),
      ...(q.search && {
        OR: [
          { fullName: { contains: q.search, mode: 'insensitive' } },
          { email: { contains: q.search, mode: 'insensitive' } },
        ],
      }),
    };
    const [total, data] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({ where, select: SAFE, orderBy: { id: 'desc' }, ...toSkipTake(q) }),
    ]);
    return paginated(data, total, q);
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  updateProfile(id: number, dto: UpdateProfileDto) {
    return this.prisma.user.update({ where: { id }, data: dto, select: SAFE });
  }
}
