import { BadRequestException } from '@nestjs/common';
import type { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

/** كل الملفات المرفوعة بتنحفظ على الديسك هون، وبالـ DB بينحفظ بس المسار (مو الملف نفسه) */
export const UPLOAD_ROOT = join(process.cwd(), 'uploads');

export type UploadKind = 'image' | 'cv' | 'material';

const MB = 1024 * 1024;
const DOC = 'application/msword';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PPT = 'application/vnd.ms-powerpoint';
const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export const UPLOAD_KINDS: Record<
  UploadKind,
  { folder: string; maxSize: number; mimes: Record<string, string> }
> = {
  image: {
    folder: 'images',
    maxSize: 5 * MB,
    mimes: { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' },
  },
  cv: {
    folder: 'cv',
    maxSize: 5 * MB,
    mimes: { 'application/pdf': '.pdf', [DOC]: '.doc', [DOCX]: '.docx' },
  },
  material: {
    folder: 'materials',
    maxSize: 20 * MB,
    mimes: {
      'application/pdf': '.pdf',
      [DOC]: '.doc',
      [DOCX]: '.docx',
      [PPT]: '.ppt',
      [PPTX]: '.pptx',
      'application/zip': '.zip',
      'image/jpeg': '.jpg',
      'image/png': '.png',
    },
  },
};

type FileInterceptorOptions = NonNullable<Parameters<typeof FileInterceptor>[1]>;

/**
 * إعدادات multer:
 * - الاسم بيتولّد عشوائي والامتداد بيجي من الـ mimetype المسموح (مو من اسم الملف يلي بعته المستخدم)
 * - فلترة النوع + حد أقصى للحجم + ملف واحد بس
 */
export function multerOptions(kind: UploadKind): FileInterceptorOptions {
  const cfg = UPLOAD_KINDS[kind];
  const dir = join(UPLOAD_ROOT, cfg.folder);
  mkdirSync(dir, { recursive: true });
  return {
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, dir),
      filename: (_req, file, cb) => cb(null, `${randomUUID()}${cfg.mimes[file.mimetype]}`),
    }),
    fileFilter: (_req, file, cb) => {
      if (!cfg.mimes[file.mimetype]) {
        return cb(
          new BadRequestException(`Unsupported file type. Allowed: ${Object.keys(cfg.mimes).join(', ')}`),
          false,
        );
      }
      cb(null, true);
    },
    limits: { fileSize: cfg.maxSize, files: 1 },
  };
}

/** المسار يلي بينخزن بالـ DB: الصور عامة (/uploads/images/..) والباقي خاص (cv/.. , materials/..) */
export function storedPath(kind: UploadKind, file: Express.Multer.File): string {
  const folder = UPLOAD_KINDS[kind].folder;
  return kind === 'image' ? `/uploads/${folder}/${file.filename}` : `${folder}/${file.filename}`;
}
