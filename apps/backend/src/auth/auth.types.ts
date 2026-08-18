import type { User as PrismaUser } from '../generated/prisma/client';
import type { Role } from '../generated/prisma/enums';

export type User = PrismaUser;

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};

export type PublicUser = Omit<User, 'password'>;

export type AuthenticatedUser = {
  userId: string;
  email: string;
  role: Role;
};
