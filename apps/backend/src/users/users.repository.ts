import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { UserCreateInput, UserModel } from '../generated/prisma/models';
import type { Role } from '../generated/prisma/enums';

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

  async findAll(params: {
    page: number;
    size: number;
    query?: string;
    role?: Role;
  }) {
    const { page, size, query, role } = params;
    const skip = (page - 1) * size;

    const where = {
      ...(query && {
        OR: [
          { name: { contains: query, mode: 'insensitive' as const } },
          { lastName: { contains: query, mode: 'insensitive' as const } },
          { email: { contains: query, mode: 'insensitive' as const } },
        ],
      }),
      ...(role && { role }),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  updateRole(id: string, role: Role): Promise<UserModel> {
    return this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }

  delete(id: string): Promise<UserModel> {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
