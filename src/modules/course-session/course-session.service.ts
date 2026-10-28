import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateSessionDto } from './dto/create-course-session.dto.js';
import { UpdateSessionDto } from '../session/dto/update-session.dto.js';


@Injectable()
export class SessionService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createSessionDto: CreateSessionDto) {
    return this.prismaService.session.create({
      data: createSessionDto as any,
    });
  }

  async findAll() {
    return this.prismaService.session.findMany();
  }

  async findOne(id: number) {
    const session = await this.prismaService.session.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    return session;
  }

  async update(id: number, updateSessionDto: UpdateSessionDto) {
    await this.findOne(id);

    return this.prismaService.session.update({
      where: { id },
      data: updateSessionDto as any,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prismaService.session.delete({
      where: { id },
    });

    return { message: `Session with ID ${id} has been deleted successfully` };
  }
}