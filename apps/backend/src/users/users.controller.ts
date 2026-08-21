import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { Roles } from 'src/common/roles.decorator';
import { RolesGuard } from 'src/common/roles.guard';
import { Role } from 'src/generated/prisma/enums';
import JwtGuard from 'src/auth/guards/jwt.guard';
import type { AuthenticatedUser } from 'src/auth/auth.types';

@Controller('users')
@UseGuards(JwtGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Post()
  create(
    @Body() dto: CreateAdminUserDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.usersService.createByAdmin(dto, req.user);
  }

  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.usersService.updateRole(id, dto, req.user);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.usersService.remove(id, req.user);
  }
}
