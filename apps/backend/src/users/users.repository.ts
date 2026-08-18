import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { UserCreateInput, UserModel } from '../generated/prisma/models';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: UserCreateInput): Promise<UserModel> {
    return this.prisma.user.create({ data });
  }

  findByEmail(email: string): Promise<UserModel | null> {
    return this.prisma.user.findFirst({
      where: { email },
    });
  }

  findById(id: string): Promise<UserModel | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
