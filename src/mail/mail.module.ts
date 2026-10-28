import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService } from './mail.service.js';



@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: 'smtp.mailtrap.io', 
        port: 2525,
        auth: {
          user: 'YOUR_EMAIL_USER',
          pass: 'YOUR_EMAIL_PASSWORD',
        },
      },
      defaults: {
        from: '"Sanad Youth" <no-reply@sanadyouth.com>',
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService], 
})
export class MailModule {}