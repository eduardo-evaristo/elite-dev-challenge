import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SeatDto } from './seat.dto';
import { TicketTypeDto } from './ticket-type.dto';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsIn(['movie', 'show'])
  type: 'movie' | 'show';

  @IsString()
  @IsNotEmpty()
  externalId: string;

  @IsIn(['TMDB', 'TICKETMASTER'])
  externalSource: 'TMDB' | 'TICKETMASTER';

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsString()
  @IsNotEmpty()
  eventClassification: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  duration: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SeatDto)
  seats?: SeatDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TicketTypeDto)
  ticketTypes?: TicketTypeDto[];

  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: 'draft' | 'published';
}
