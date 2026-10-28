import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationDto } from './dto/update-application.dto.js';
import { MailService } from '../../mail/mail.service.js';


@Injectable()
export class ApplicationService {
  constructor(private readonly prismaService: PrismaService,
              private readonly mailService: MailService,
  ) {}


  async create(userId: number, createApplicationDto: CreateApplicationDto) {
    return this.prismaService.application.create({
      data: {
        userId,
        ...createApplicationDto,
      } as any,
    });
  }

 
  async findAll() {
    return this.prismaService.application.findMany({
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        program: true,
      },
    });
  }

  async findUserApplications(userId: number) {
    return await this.prismaService.application.findMany({
      where: { userId },
      include: {
        program: true, 
      },
    });
  } 


  async findOne(id: number) {
    const application = await this.prismaService.application.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        program: true,
      },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    return application;
  }

 
  async update(id: number, updateApplicationDto: UpdateApplicationDto) {
    await this.findOne(id);

    return this.prismaService.application.update({
      where: { id },
      data: updateApplicationDto as any,
    });
  }
 
  async updateStatus(id: number, status: string, adminMessage?: string) {
   
    const application = await this.prismaService.application.findUnique({
      where: { id },
      include: {
        user: true,   
        program: true, 
      },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    const updatedApplication = await this.prismaService.application.update({
      where: { id },
      data: {
        status: status as any, 
      },
    });
    if (application.user && application.user.email) {
      await this.mailService.sendApplicationStatusEmail(
        application.user.email,
        application.user.fullName,
        application.program.title,
        status,
      );
    }

    return {
      message: `Application has been ${status.toLowerCase()} successfully`,
      application: updatedApplication,
    };
  }


  async remove(id: number) {
    await this.findOne(id);

    await this.prismaService.application.delete({
      where: { id },
    });

    return { message: `Application with ID ${id} has been deleted successfully` };
  }
}