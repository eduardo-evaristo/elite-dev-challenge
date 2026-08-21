import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from 'src/generated/prisma/enums';

export class UpdateUserRoleDto {
  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;
}
