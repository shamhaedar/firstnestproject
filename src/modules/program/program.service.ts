import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateProgramDto } from './dto/create-program.dto.js';
import { UpdateProgramDto } from './dto/update-program.dto.js';


@Injectable()
export class ProgramService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createProgramDto: CreateProgramDto) {
    return this.prismaService.program.create({
      data: createProgramDto as any,
    });
  }

  async findAll() {
    return this.prismaService.program.findMany();
  }

  async findOne(id: number) {
    const program = await this.prismaService.program.findUnique({
      where: { id },
    });

    if (!program) {
      throw new NotFoundException(`Program with ID ${id} not found`);
    }

    return program;
  }

  async update(id: number, updateProgramDto: UpdateProgramDto) {
    await this.findOne(id); 

    return this.prismaService.program.update({
      where: { id },
      data: updateProgramDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prismaService.program.delete({
      where: { id },
    });

    return { message: `Program with ID ${id} has been deleted successfully` };
  }
}