import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js'; 
@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  
  async findAll() {
    return this.prismaService.user.findMany({
      omit: {
        password: true, 
      },
    });
  }

  async findOne(id: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      omit: {
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(id: number, updateData: { fullName?: string; phone?: string; role?: any }) {
    await this.findOne(id);

    return this.prismaService.user.update({
      where: { id },
      data: updateData,
      omit: {
        password: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prismaService.user.delete({
      where: { id },
    });

    return { message: `User with ID ${id} has been deleted successfully` };
  }
}