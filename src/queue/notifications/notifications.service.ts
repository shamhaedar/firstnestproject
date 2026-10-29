import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NOTIFICATIONS_QUEUE } from './notifications.constants.js';

/**
 * بيحط مهام الإشعارات بالـ queue (BullMQ/Redis) وبيرجع فورًا.
 * إذا Redis واقع الطلب الأساسي (تسجيل/قبول) ما بيتأثر: الأخطاء بتنسجّل بس.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue) {
    this.queue.on('error', (e) => this.logger.warn(`Queue error: ${e.message}`));
  }

  private enqueue(name: string, data: Record<string, unknown>) {
    this.queue
      .add(name, data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      })
      .catch((e) => this.logger.warn(`Could not enqueue "${name}": ${e.message}`));
  }

  welcome(user: { fullName: string; email: string }) {
    this.enqueue('welcome', { ...user });
  }

  applicationDecision(p: { email: string; fullName: string; programTitle: string; status: string }) {
    this.enqueue('application-decision', { ...p });
  }
}
