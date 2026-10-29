import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { closeSync, openSync, readSync } from 'node:fs';
import { catchError, throwError } from 'rxjs';
import { StorageService } from './storage.service.js';

const startsWith = (b: Buffer, sig: number[], offset = 0) => sig.every((v, i) => b[offset + i] === v);

/** فحص الـ magic bytes: المحتوى الحقيقي للملف لازم يطابق الـ mimetype يلي ادّعاه العميل */
const SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  'image/png': (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/webp': (b) => startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8),
  'application/pdf': (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46]),
  'application/msword': (b) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0]),
  'application/vnd.ms-powerpoint': (b) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0]),
  'application/zip': (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]),
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]),
};

function head(path: string): Buffer {
  const fd = openSync(path, 'r');
  try {
    const buf = Buffer.alloc(16);
    readSync(fd, buf, 0, 16, 0);
    return buf;
  } finally {
    closeSync(fd);
  }
}

/**
 * بيجي بعد FileInterceptor مباشرة:
 *  1) بيتحقق من محتوى الملف (magic bytes).
 *  2) إذا صار أي خطأ بعدها (validation للـ DTO، 404، 409 ...) بيمسح الملف المرفوع
 *     حتى ما يضل ملف يتيم على الديسك.
 */
@Injectable()
export class UploadGuardInterceptor implements NestInterceptor {
  constructor(private readonly storage: StorageService) {}

  async intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest();
    const files: Express.Multer.File[] = [
      ...(req.file ? [req.file] : []),
      ...(Array.isArray(req.files) ? req.files : []),
    ];

    const cleanup = () => Promise.all(files.map((f) => this.storage.removeAbsolute(f.path)));

    for (const f of files) {
      const check = SIGNATURES[f.mimetype];
      if (!check || !check(head(f.path))) {
        await cleanup();
        throw new BadRequestException('File content does not match its declared type');
      }
    }

    return next.handle().pipe(
      catchError((err) => {
        void cleanup();
        return throwError(() => err);
      }),
    );
  }
}
