import { Injectable, Logger, NotFoundException, StreamableFile } from '@nestjs/common';
import { createReadStream, existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { UPLOAD_ROOT } from './upload.config.js';

const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  /** يحوّل المسار المخزن لمسار مطلق ويتأكد إنه داخل مجلد uploads (حماية من path traversal) */
  resolve(stored: string): string {
    const rel = stored.replace(/^\/?uploads\//, '').replace(/^\//, '');
    const abs = resolve(join(UPLOAD_ROOT, rel));
    if (!abs.startsWith(UPLOAD_ROOT + sep)) throw new NotFoundException('File not found');
    return abs;
  }

  async remove(stored?: string | null): Promise<void> {
    if (!stored) return;
    try {
      await this.removeAbsolute(this.resolve(stored));
    } catch {
      /* ignore */
    }
  }

  async removeAbsolute(absPath: string): Promise<void> {
    try {
      await unlink(absPath);
    } catch (e: any) {
      if (e?.code !== 'ENOENT') this.logger.warn(`Could not delete ${absPath}: ${e?.message}`);
    }
  }

  /** تحميل ملف خاص (CV / مادة) عن طريق الـ API بعد فحص الصلاحيات، مو عن طريق static */
  download(stored: string, res: { set: (h: Record<string, string>) => unknown }, name: string) {
    const abs = this.resolve(stored);
    if (!existsSync(abs)) throw new NotFoundException('File not found');
    const ext = extname(abs).toLowerCase();
    res.set({
      'Content-Type': MIME_BY_EXT[ext] ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}${ext}`,
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(createReadStream(abs));
  }
}
