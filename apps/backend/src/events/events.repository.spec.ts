import { Test, TestingModule } from '@nestjs/testing';
import { EventsRepository } from './events.repository';
import { PrismaService } from '../prisma.service';

type MockPrismaEvent = {
  create: jest.Mock;
  findUnique: jest.Mock;
  findMany: jest.Mock;
  count: jest.Mock;
  update: jest.Mock;
};

type MockPrismaService = {
  event: MockPrismaEvent;
};

describe('EventsRepository', () => {
  let repository: EventsRepository;
  let prismaMock: MockPrismaService;

  const mockEvent = {
    id: 'event-1',
    name: 'Avengers Endgame',
    date: new Date('2025-12-01T20:00:00.000Z'),
    location: 'Cinema XYZ',
    type: 'MOVIE',
    status: 'PUBLISHED',
    externalId: 'tmdb-299534',
    externalSource: 'TMDB',
    imageUrl: 'https://image.tmdb.org/t/p/w500/abc.jpg',
    eventClassification: '14',
    description: 'Um filme de acao.',
    duration: 120,
    organizerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaMock = {
      event: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsRepository,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    repository = module.get<EventsRepository>(EventsRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create an event with nested seats and include', async () => {
      const eventWithSeats = {
        ...mockEvent,
        seats: [
          {
            id: 'seat-1',
            eventId: 'event-1',
            row: 'A',
            number: 1,
            status: 'AVAILABLE',
          },
        ],
      };
      prismaMock.event.create.mockResolvedValue(eventWithSeats);

      const data = {
        name: 'Avengers Endgame',
        date: '2025-12-01T20:00:00.000Z',
        location: 'Cinema XYZ',
        type: 'MOVIE' as const,
        status: 'PUBLISHED' as const,
        externalId: 'tmdb-299534',
        externalSource: 'TMDB' as const,
        organizer: { connect: { id: 'user-1' } },
        seats: {
          create: [{ row: 'A', number: 1 }],
        },
      };
      const include = { seats: true, ticketTypes: true };

      const result = await repository.create(data, include);

      expect(prismaMock.event.create).toHaveBeenCalledWith({
        data,
        include,
      });
      expect(result).toEqual(eventWithSeats);
    });

    it('should create an event with nested ticket types and include', async () => {
      const eventWithTickets = {
        ...mockEvent,
        type: 'SHOW',
        ticketTypes: [
          {
            id: 'tt-1',
            eventId: 'event-1',
            name: 'Pista',
            price: { toString: () => '100.00' },
            capacity: 500,
            availableCount: 500,
          },
        ],
      };
      prismaMock.event.create.mockResolvedValue(eventWithTickets);

      const data = {
        name: 'Show Test',
        date: '2025-12-01T20:00:00.000Z',
        location: 'Arena',
        type: 'SHOW' as const,
        status: 'PUBLISHED' as const,
        externalId: 'tm-123',
        externalSource: 'TICKETMASTER' as const,
        organizer: { connect: { id: 'user-1' } },
        ticketTypes: {
          create: [
            {
              name: 'Pista',
              price: 100,
              capacity: 500,
              availableCount: 500,
            },
          ],
        },
      };
      const include = { seats: true, ticketTypes: true };

      const result = await repository.create(data, include);

      expect(prismaMock.event.create).toHaveBeenCalledWith({
        data,
        include,
      });
      expect(result).toEqual(eventWithTickets);
    });
  });

  describe('findById', () => {
    it('should return an event with include when found', async () => {
      const eventWithRelations = {
        ...mockEvent,
        seats: [],
        ticketTypes: [],
      };
      prismaMock.event.findUnique.mockResolvedValue(eventWithRelations);

      const include = { seats: true, ticketTypes: true };
      const result = await repository.findById('event-1', include);

      expect(prismaMock.event.findUnique).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        include,
      });
      expect(result).toEqual(eventWithRelations);
    });

    it('should return null when event is not found', async () => {
      prismaMock.event.findUnique.mockResolvedValue(null);

      const result = await repository.findById('missing-id');

      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('should find events with pagination (skip/take) and where clause', async () => {
      prismaMock.event.findMany.mockResolvedValue([mockEvent]);

      const params = {
        where: { status: 'PUBLISHED' },
        skip: 0,
        take: 20,
      };

      const result = await repository.findMany(params);

      expect(prismaMock.event.findMany).toHaveBeenCalledWith(params);
      expect(result).toEqual([mockEvent]);
    });

    it('should apply skip for second page', async () => {
      prismaMock.event.findMany.mockResolvedValue([]);

      const params = {
        where: { status: 'PUBLISHED', type: 'SHOW' },
        skip: 10,
        take: 10,
      };

      await repository.findMany(params);

      expect(prismaMock.event.findMany).toHaveBeenCalledWith(params);
    });
  });

  describe('count', () => {
    it('should count events matching the where clause', async () => {
      prismaMock.event.count.mockResolvedValue(42);

      const where = { status: 'PUBLISHED' };
      const result = await repository.count(where);

      expect(prismaMock.event.count).toHaveBeenCalledWith({ where });
      expect(result).toBe(42);
    });
  });

  describe('update', () => {
    it('should soft-delete by updating status to CANCELLED', async () => {
      const cancelledEvent = { ...mockEvent, status: 'CANCELLED' };
      prismaMock.event.update.mockResolvedValue(cancelledEvent);

      const result = await repository.update('event-1', {
        status: { set: 'CANCELLED' },
      });

      expect(prismaMock.event.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: { status: { set: 'CANCELLED' } },
      });
      expect(result).toEqual(cancelledEvent);
    });

    it('should update scalar fields', async () => {
      const updatedEvent = { ...mockEvent, name: 'Updated Name' };
      prismaMock.event.update.mockResolvedValue(updatedEvent);

      const result = await repository.update('event-1', {
        name: 'Updated Name',
      });

      expect(prismaMock.event.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: { name: 'Updated Name' },
      });
      expect(result).toEqual(updatedEvent);
    });
  });
});
