import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AppCacheService } from './app-cache.service.js';

@Global()
@Module({
  imports: [CacheModule.register({ ttl: 60_000, max: 1000 })],
  providers: [AppCacheService],
  exports: [AppCacheService],
})
export class AppCacheModule {}
