import { IsInt, IsString, Min } from 'class-validator';

export class SeatDto {
  @IsString()
  row: string;

  @IsInt()
  @Min(1)
  number: number;
}
