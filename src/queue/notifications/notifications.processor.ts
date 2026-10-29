import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NOTIFICATIONS_QUEUE } from './notifications.constants.js';

/** Worker: هون مكان إرسال الإيميل/SMS الحقيقي. حاليًا بيسجّل بس (محاكاة). */
@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  async process(job: Job<any>): Promise<void> {
    switch (job.name) {
      case 'welcome':
        this.logger.log(`[email → ${job.data.email}] Welcome ${job.data.fullName} to Youth Sanad`);
        break;
      case 'application-decision':
        this.logger.log(
          `[email → ${job.data.email}] Your application to "${job.data.programTitle}" is now ${job.data.status}`,
        );
        break;
      default:
        this.logger.warn(`Unknown job: ${job.name}`);
    }
  }

  @OnWorkerEvent('error')
  onError(e: Error) {
    this.logger.warn(`Worker error: ${e.message}`);
  }
}
