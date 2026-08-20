import { IsOptional, IsString } from 'class-validator';
import { ExactlyOneOf } from 'src/common/validators/exactly-one-of.validator';

export class ValidateTicketDto {
  @ExactlyOneOf(['signature', 'manualEntryCode'], {
    message: 'Forneça exatamente um de signature ou manualEntryCode',
  })
  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsString()
  publicId?: string;

  @IsOptional()
  @IsString()
  manualEntryCode?: string;

  @IsOptional()
  @IsString()
  expectedEventId?: string;
}
