import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseSessionDto } from './create-course-session.dto.js';

export class UpdateCourseSessionDto extends PartialType(CreateCourseSessionDto) {}
