import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';
import { UploadGuardInterceptor } from './upload-guard.interceptor.js';

@Global()
@Module({
  providers: [StorageService, UploadGuardInterceptor],
  exports: [StorageService, UploadGuardInterceptor],
})
export class UploadModule {}
