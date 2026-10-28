import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateMaterialDto } from '../material/dto/create-material.dto.js';
import { UpdateMaterialDto } from './dto/update-material.dto.js';

@Injectable()
export class MaterialService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createMaterialDto: CreateMaterialDto) {
    return this.prismaService.material.create({
      data: createMaterialDto as any,
    });
  }

  async findAll() {
    return this.prismaService.material.findMany({
      include: {
        courseSession: true,
      },
    }as any);
  }

  async findOne(id: number) {
    const material = await this.prismaService.material.findUnique({
      where: { id },
      include: {
        courseSession: true,
      },
    } as any);

    if (!material) {
      throw new NotFoundException(`Material with ID ${id} not found`);
    }

    return material;
  }

  async update(id: number, updateMaterialDto: UpdateMaterialDto) {
    await this.findOne(id);

    return this.prismaService.material.update({
      where: { id },
      data: updateMaterialDto as any,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prismaService.material.delete({
      where: { id },
    });

    return { message: `Material with ID ${id} has been deleted successfully` };
  }
}