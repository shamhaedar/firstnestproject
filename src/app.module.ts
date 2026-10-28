import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UserModule } from './modules/user/user.module.js';
import { ProgramModule } from './modules/program/program.module.js';
import { AnnouncementModule } from './modules/announcement/announcement.module.js';
import { ApplicationModule } from './modules/application/application.module.js';
import { SessionModule } from './modules/session/session.module.js';
import { MailModule } from './mail/mail.module.js';
import { MaterialModule } from './modules/material/material.module.js';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100, 
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,     
    AuthModule,      
    UserModule,      
    ProgramModule,   
    AnnouncementModule, 
    ApplicationModule,  
    SessionModule, 
    MaterialModule,    
    SessionModule,    
    MailModule,         
  ],
  controllers: [],
  providers: [{
      provide: APP_GUARD,
      useClass: ThrottlerGuard, 
    },],
})
export class AppModule {}