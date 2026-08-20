import { IsOptional, IsString } from 'class-validator';

export class ValidateTicketDto {
  @IsString()
  publicId: string;

  @IsString()
  signature: string;

  @IsOptional()
  @IsString()
  expectedEventId?: string;
}
