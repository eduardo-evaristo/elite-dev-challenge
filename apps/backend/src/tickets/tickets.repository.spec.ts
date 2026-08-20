import { Test, TestingModule } from '@nestjs/testing';
import { TicketsRepository } from './tickets.repository';
import { PrismaService } from '../prisma.service';

type MockPrismaService = {
  ticket: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    updateMany: jest.Mock;
  };
  reservation: {
    findUnique: jest.Mock;
  };
};

describe('TicketsRepository', () => {
  let repository: TicketsRepository;
  let prismaMock: MockPrismaService;

  const mockTicket = {
    id: 't-1',
    reservationId: 'r-1',
    userId: 'user-1',
    signature: 'sig-hex',
    usedAt: null,
    createdAt: new Date(),
  };

  const mockReservation = {
    id: 'r-1',
    eventId: 'evt-1',
    userId: 'user-1',
    status: 'CONFIRMED',
  };

  beforeEach(async () => {
    prismaMock = {
      ticket: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
      },
      reservation: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsRepository,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    repository = module.get<TicketsRepository>(TicketsRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a ticket with relation-based input', async () => {
      const data = {
        id: 't-1',
        reservation: { connect: { id: 'r-1' } },
        user: { connect: { id: 'user-1' } },
        signature: 'sig-hex',
      };
      prismaMock.ticket.create.mockResolvedValue(mockTicket);

      const result = await repository.create(data);

      expect(prismaMock.ticket.create).toHaveBeenCalledWith({ data });
      expect(result).toEqual(mockTicket);
    });
  });

  describe('findByPublicId', () => {
    it('should find a ticket by id', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(mockTicket);

      const result = await repository.findByPublicId('t-1');

      expect(prismaMock.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: 't-1' },
        include: undefined,
      });
      expect(result).toEqual(mockTicket);
    });

    it('should return null when not found', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(null);

      expect(await repository.findByPublicId('missing')).toBeNull();
    });
  });

  describe('findManyByUser', () => {
    it('should query by userId with pagination and ordering', async () => {
      prismaMock.ticket.findMany.mockResolvedValue([mockTicket]);

      const result = await repository.findManyByUser('user-1', {
        skip: 0,
        take: 20,
      });

      expect(prismaMock.ticket.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        skip: 0,
        take: 20,
        include: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockTicket]);
    });
  });

  describe('countByUser', () => {
    it('should count tickets by userId', async () => {
      prismaMock.ticket.count.mockResolvedValue(5);

      expect(await repository.countByUser('user-1')).toBe(5);
      expect(prismaMock.ticket.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('markUsed', () => {
    type UpdateArgs = {
      where: { id: string; usedAt: null };
      data: { usedAt: Date };
    };

    it('should use where { id, usedAt: null } as the single-winner guard', async () => {
      // Capture via a typed mockImplementation to avoid `expect.any(Date)`,
      // which is typed as `any` and trips no-unsafe-assignment.
      let captured: UpdateArgs | undefined;
      prismaMock.ticket.updateMany.mockImplementation((arg: UpdateArgs) => {
        captured = arg;
        return { count: 1 };
      });

      const result = await repository.markUsed('t-1');

      expect(captured?.where).toEqual({ id: 't-1', usedAt: null });
      expect(captured?.data.usedAt).toBeInstanceOf(Date);
      expect(result).toEqual({ count: 1 });
    });

    it('should return count 0 when the ticket was already used', async () => {
      prismaMock.ticket.updateMany.mockResolvedValue({ count: 0 });

      expect(await repository.markUsed('t-1')).toEqual({ count: 0 });
    });
  });

  describe('findReservationWithEvent', () => {
    it('should select id, eventId, userId, status', async () => {
      prismaMock.reservation.findUnique.mockResolvedValue(mockReservation);

      const result = await repository.findReservationWithEvent('r-1');

      expect(prismaMock.reservation.findUnique).toHaveBeenCalledWith({
        where: { id: 'r-1' },
        select: { id: true, eventId: true, userId: true, status: true },
      });
      expect(result).toEqual(mockReservation);
    });

    it('should return null when reservation is not found', async () => {
      prismaMock.reservation.findUnique.mockResolvedValue(null);

      expect(await repository.findReservationWithEvent('missing')).toBeNull();
    });
  });
});
