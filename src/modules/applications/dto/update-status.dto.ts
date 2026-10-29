import { IsIn } from 'class-validator';
import { ApplicationStatus } from '../../../common/enums/index.js';

export class UpdateApplicationStatusDto {
  @IsIn([ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED])
  status: 'ACCEPTED' | 'REJECTED';
}
