import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { paginated, toSkipTake } from '../../common/pagination/index.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { StorageService } from '../../common/upload/storage.service.js';
import { storedPath } from '../../common/upload/upload.config.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProgramsService } from '../programs/programs.service.js';
import { CreateMaterialDto } from './dto/create-material.dto.js';
import { ListMaterialsDto } from './dto/list-materials.dto.js';

@Injectable()
export class MaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly programs: ProgramsService,
    private readonly storage: StorageService,
  ) {}

  private view(m: { id: number; title: string; uploadedAt: Date; programId: number }) {
    return { ...m, downloadUrl: `/api/materials/${m.id}/download` };
  }

  async create(programId: number, user: AuthUser, dto: CreateMaterialDto, file?: Express.Multer.File) {
    await this.programs.assertCanManage(programId, user);
    if (!file) throw new BadRequestException('file is required');
    const m = await this.prisma.material.create({
      data: { programId, title: dto.title, fileUrl: storedPath('material', file) },
    });
    return this.view(m);
  }

  /** الأدمن، مشرف البرنامج، أو شاب مقبول فقط */
  async list(programId: number, user: AuthUser, q: ListMaterialsDto) {
    await this.programs.assertCanViewContent(programId, user);
    const where = { programId, ...(q.search && { title: { contains: q.search, mode: 'insensitive' as const } }) };
    const [total, rows] = await Promise.all([
      this.prisma.material.count({ where }),
      this.prisma.material.findMany({
        where,
        select: { id: true, title: true, uploadedAt: true, programId: true },
        orderBy: { uploadedAt: 'desc' },
        ...toSkipTake(q),
      }),
    ]);
    return paginated(rows.map((r) => this.view(r)), total, q);
  }

  async download(id: number, user: AuthUser, res: { set: (h: Record<string, string>) => unknown }) {
    const m = await this.prisma.material.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Material not found');
    await this.programs.assertCanViewContent(m.programId, user);
    return this.storage.download(m.fileUrl, res, m.title);
  }

  async remove(id: number, user: AuthUser) {
    const m = await this.prisma.material.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Material not found');
    await this.programs.assertCanManage(m.programId, user);
    await this.prisma.material.delete({ where: { id } });
    await this.storage.remove(m.fileUrl);
    return { message: 'Material deleted' };
  }
}
