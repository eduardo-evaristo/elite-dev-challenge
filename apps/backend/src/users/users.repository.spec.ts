import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from './users.repository';
import { PrismaService } from '../prisma.service';
import type { UserModel } from '../generated/prisma/models';

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser: UserModel = {
    id: 'user-1',
    name: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'hashed-password',
    role: 'CLIENT',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const prismaMock = {
      user: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a user with the provided data', async () => {
      prismaService.user.create.mockResolvedValue(mockUser);

      const result = await repository.create({
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'plain-password',
        role: 'CLIENT',
      });

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'plain-password',
          role: 'CLIENT',
        },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByEmail', () => {
    it('should return a user when one exists with the given email', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await repository.findByEmail('john@example.com');

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when no user is found with the given email', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);

      const result = await repository.findByEmail('missing@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a user when one exists with the given id', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findById('user-1');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when no user is found with the given id', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await repository.findById('missing-id');

      expect(result).toBeNull();
    });
  });
});
