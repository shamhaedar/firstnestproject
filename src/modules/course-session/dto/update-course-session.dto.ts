import { PartialType } from '@nestjs/mapped-types';
import {  CreateSessionDto } from './create-course-session.dto.js';

export class UpdateCourseSessionDto extends PartialType(CreateSessionDto) {}
