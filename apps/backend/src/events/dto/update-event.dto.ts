import { IsIn, IsOptional } from 'class-validator';
import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateEventDto } from './create-event.dto';

export class UpdateEventDto extends PickType(PartialType(CreateEventDto), [
  'name',
  'date',
  'location',
  'imageUrl',
  'eventClassification',
  'description',
  'duration',
] as const) {
  @IsOptional()
  @IsIn(['draft', 'published', 'cancelled'])
  status?: 'draft' | 'published' | 'cancelled';
}
