import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ExactlyOneOf } from 'src/common/validators/exactly-one-of.validator';

export class CreateReservationDto {
  @ExactlyOneOf(['seatId', 'ticketTypeId'], {
    message: 'Forneça exatamente um de seatId ou ticketTypeId',
  })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsOptional()
  @IsString()
  seatId?: string;

  @IsOptional()
  @IsString()
  ticketTypeId?: string;
}
