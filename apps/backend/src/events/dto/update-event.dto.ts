import { IsArray, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { PartialType, PickType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { CreateEventDto } from './create-event.dto';
import { TicketTypeDto } from './ticket-type.dto';

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketTypeDto)
  ticketTypes?: TicketTypeDto[];
}
