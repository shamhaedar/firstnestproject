import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('announcement-image-queue')
export class AnnouncementProcessor extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    const { announcementId, filePath } = job.data;

    console.log(`Processing image for announcement ID: ${announcementId}`);
   
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('Image processed successfully!');
    return { success: true };
  }
}