import { IsNotEmpty, IsString } from 'class-validator';

export class PayReservationDto {
  @IsString()
  @IsNotEmpty()
  cardNumber: string;
}
