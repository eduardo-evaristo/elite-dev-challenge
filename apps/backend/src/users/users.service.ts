import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { AuthenticatedUser } from 'src/auth/auth.types';
import { Role } from 'src/generated/prisma/enums';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto) {
    return this.usersRepository.create({
      ...createUserDto,
      role: 'CLIENT',
    });
  }

  async createByAdmin(dto: CreateAdminUserDto, requestUser: AuthenticatedUser) {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    if (requestUser.role !== Role.ADMIN && dto.role === Role.ADMIN) {
      throw new ForbiddenException('Only admins can create admin users');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.usersRepository.create({
      name: dto.name,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      role: dto.role,
    });

    const { password: _, ...result } = user as typeof user & {
      password: string;
    };
    return result;
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async findAll(query: QueryUsersDto) {
    return this.usersRepository.findAll(query);
  }

  async updateRole(
    id: string,
    dto: UpdateUserRoleDto,
    requestUser: AuthenticatedUser,
  ) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    if (user.id === requestUser.userId) {
      throw new ForbiddenException('Cannot change your own role');
    }

    if (dto.role === Role.ADMIN && requestUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can assign admin role');
    }

    await this.usersRepository.updateRole(id, dto.role);

    const updated = await this.usersRepository.findById(id);
    const { password: _, ...result } = updated as typeof updated & {
      password: string;
    };
    return result;
  }

  async remove(id: string, requestUser: AuthenticatedUser) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    if (user.id === requestUser.userId) {
      throw new ForbiddenException('Cannot delete yourself');
    }

    await this.usersRepository.delete(id);

    return { id };
  }
}
