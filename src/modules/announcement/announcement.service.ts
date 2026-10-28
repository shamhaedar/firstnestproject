import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateAnnouncementDto } from './dto/create-announcement.dto.js';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto.js';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';


@Injectable()
export class AnnouncementService {
  constructor(private readonly prismaService: PrismaService,
    @InjectQueue('announcement-image-queue') private readonly imageQueue: Queue,
  ) {}

  async createAnnouncementWithImage(dto: any, file: Express.Multer.File) {
  
    const announcement = await (this.prismaService.announcement.create as any)({
      data: {
        title: dto.title,
        content: dto.content,
        imageUrl: file ? file.path : null,
      },
    });

    
    if (file) {
      await this.imageQueue.add('process-announcement-image', {
        announcementId: announcement.id,
        filePath: file.path,
      });
    }

    return {
      message: 'Announcement created and image processing queued successfully',
      announcement,
    };
  }

  async create(createAnnouncementDto: CreateAnnouncementDto) {
    return this.prismaService.announcement.create({
      data: createAnnouncementDto as any,
    });
  }

  async findAll() {
    return this.prismaService.announcement.findMany();
  }

  async findOne(id: number) {
    const announcement = await this.prismaService.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      throw new NotFoundException(`Announcement with ID ${id} not found`);
    }

    return announcement;
  }

  async update(id: number, updateAnnouncementDto: UpdateAnnouncementDto) {
    await this.findOne(id);

    return this.prismaService.announcement.update({
      where: { id },
      data: updateAnnouncementDto as any,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prismaService.announcement.delete({
      where: { id },
    });

    return { message: `Announcement with ID ${id} has been deleted successfully` };
  }
}