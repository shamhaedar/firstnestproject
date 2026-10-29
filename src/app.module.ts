import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { AppCacheModule } from './common/cache/app-cache.module.js';
import { UploadModule } from './common/upload/upload.module.js';
import { ModulesModule } from './modules/modules.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SeedModule } from './seed/seed.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting عام (الـ endpoints الحساسة كـ login إلها حد أشد داخل الـ controller)
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: Number(config.get('THROTTLE_LIMIT') ?? 100) }],
      }),
    }),

    // BullMQ على Redis (الإشعارات)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST') ?? '127.0.0.1',
          port: Number(config.get('REDIS_PORT') ?? 6379),
          password: config.get('REDIS_PASSWORD') || undefined,
        },
      }),
    }),

    PrismaModule,
    AppCacheModule,
    UploadModule,
    AuthModule,
    ModulesModule,
    SeedModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
