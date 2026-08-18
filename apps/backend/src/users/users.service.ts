import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto) {
    return this.usersRepository.create({
      ...createUserDto,
      role: 'CLIENT',
    });
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }
}
