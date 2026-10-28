import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendApplicationStatusEmail(email: string, userName: string, programTitle: string, status: string) {
    const isAccepted = status === 'ACCEPTED';
    
    const subject = isAccepted 
      ? 'congratulations! Your application has been accepted' 
      : 'update on your application status';

    const message = isAccepted
      ? `Dear ${userName},\n\nWe are pleased to inform you that 
         your application to join the "${programTitle}" 
         program has been accepted. You can now follow the 
         course details through the platform.\n\nBest regards!`
      : `Dear ${userName},\n\nWe are sorry to inform
       you that your application to join the "${programTitle}" 
       program has not been accepted at this time.\n\nWe wish you the
        best in future opportunities.`;

    await this.mailerService.sendMail({
      to: email,
      subject: subject,
      text: message, 
    });
  }
}