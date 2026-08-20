import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsRepository } from './reservations.repository';
import { PrismaService } from '../prisma.service';

type MockPrismaService = {
  seat: { findUnique: jest.Mock; update: jest.Mock };
  ticketType: { findUnique: jest.Mock };
  reservation: { create: jest.Mock; update: jest.Mock };
  $transaction: jest.Mock;
};

type FakeTx = {
  seat: { update: jest.Mock };
  ticketType: { updateMany: jest.Mock };
  reservation: { create: jest.Mock; update: jest.Mock };
};

describe('ReservationsRepository', () => {
  let repository: ReservationsRepository;
  let prismaMock: MockPrismaService;

  const mockSeat = {
    id: 'seat-1',
    eventId: 'evt-1',
    row: 'A',
    number: 1,
    status: 'AVAILABLE',
  };

  const mockTicketType = {
    id: 'tt-1',
    eventId: 'evt-1',
    name: 'Pista',
    price: { toString: () => '100.00' },
    capacity: 500,
    availableCount: 500,
  };

  const mockReservation = {
    id: 'r-1',
    eventId: 'evt-1',
    userId: 'user-1',
    seatId: 'seat-1',
    ticketTypeId: null,
    status: 'PENDING',
    paymentStatus: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaMock = {
      seat: { findUnique: jest.fn(), update: jest.fn() },
      ticketType: { findUnique: jest.fn() },
      reservation: { create: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsRepository,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    repository = module.get<ReservationsRepository>(ReservationsRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findSeat', () => {
    it('should find a seat by id', async () => {
      prismaMock.seat.findUnique.mockResolvedValue(mockSeat);

      const result = await repository.findSeat('seat-1');

      expect(prismaMock.seat.findUnique).toHaveBeenCalledWith({
        where: { id: 'seat-1' },
      });
      expect(result).toEqual(mockSeat);
    });

    it('should return null when seat is not found', async () => {
      prismaMock.seat.findUnique.mockResolvedValue(null);

      const result = await repository.findSeat('missing');

      expect(result).toBeNull();
    });
  });

  describe('findTicketType', () => {
    it('should find a ticket type by id', async () => {
      prismaMock.ticketType.findUnique.mockResolvedValue(mockTicketType);

      const result = await repository.findTicketType('tt-1');

      expect(prismaMock.ticketType.findUnique).toHaveBeenCalledWith({
        where: { id: 'tt-1' },
      });
      expect(result).toEqual(mockTicketType);
    });

    it('should return null when ticket type is not found', async () => {
      prismaMock.ticketType.findUnique.mockResolvedValue(null);

      const result = await repository.findTicketType('missing');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a reservation and update seat status to RESERVED', async () => {
      const data = {
        event: { connect: { id: 'evt-1' } },
        user: { connect: { id: 'user-1' } },
        seat: { connect: { id: 'seat-1' } },
        status: 'PENDING' as const,
      };
      const reservationCreate = jest.fn().mockResolvedValue(mockReservation);
      const seatUpdate = jest.fn();
      const fakeTx: FakeTx = {
        seat: { update: seatUpdate },
        ticketType: { updateMany: jest.fn() },
        reservation: { create: reservationCreate },
      };
      prismaMock.$transaction.mockImplementation(
        (fn: (tx: FakeTx) => Promise<unknown>) => fn(fakeTx),
      );

      const result = await repository.create(data);

      expect(reservationCreate).toHaveBeenCalledWith({ data });
      expect(seatUpdate).toHaveBeenCalledWith({
        where: { id: 'seat-1' },
        data: { status: 'RESERVED' },
      });
      expect(result).toEqual(mockReservation);
    });

    it('should create a ticket-type reservation without updating seat', async () => {
      const data = {
        event: { connect: { id: 'evt-1' } },
        user: { connect: { id: 'user-1' } },
        ticketType: { connect: { id: 'tt-1' } },
        status: 'PENDING' as const,
      };
      const ticketTypeReservation = {
        ...mockReservation,
        seatId: null,
        ticketTypeId: 'tt-1',
      };
      const reservationCreate = jest
        .fn()
        .mockResolvedValue(ticketTypeReservation);
      const seatUpdate = jest.fn();
      const fakeTx: FakeTx = {
        seat: { update: seatUpdate },
        ticketType: { updateMany: jest.fn() },
        reservation: { create: reservationCreate },
      };
      prismaMock.$transaction.mockImplementation(
        (fn: (tx: FakeTx) => Promise<unknown>) => fn(fakeTx),
      );

      const result = await repository.create(data);

      expect(reservationCreate).toHaveBeenCalledWith({ data });
      expect(seatUpdate).not.toHaveBeenCalled();
      expect(result).toEqual(ticketTypeReservation);
    });
  });

  describe('confirm', () => {
    it('should confirm reservation and update seat status to SOLD', async () => {
      const confirmedReservation = {
        ...mockReservation,
        status: 'CONFIRMED',
        paymentStatus: 'APPROVED',
      };
      const reservationUpdate = jest
        .fn()
        .mockResolvedValue(confirmedReservation);
      const seatUpdate = jest.fn();
      const fakeTx: FakeTx = {
        seat: { update: seatUpdate },
        ticketType: { updateMany: jest.fn() },
        reservation: { update: reservationUpdate },
      };
      prismaMock.$transaction.mockImplementation(
        (fn: (tx: FakeTx) => Promise<unknown>) => fn(fakeTx),
      );

      const result = await repository.confirm('r-1');

      expect(reservationUpdate).toHaveBeenCalledWith({
        where: { id: 'r-1' },
        data: { status: 'CONFIRMED', paymentStatus: 'APPROVED' },
      });
      expect(seatUpdate).toHaveBeenCalledWith({
        where: { id: 'seat-1' },
        data: { status: 'SOLD' },
      });
      expect(result).toEqual(confirmedReservation);
    });

    it('should confirm ticket-type reservation without updating seat', async () => {
      const confirmedReservation = {
        ...mockReservation,
        seatId: null,
        ticketTypeId: 'tt-1',
        status: 'CONFIRMED',
        paymentStatus: 'APPROVED',
      };
      const reservationUpdate = jest
        .fn()
        .mockResolvedValue(confirmedReservation);
      const seatUpdate = jest.fn();
      const fakeTx: FakeTx = {
        seat: { update: seatUpdate },
        ticketType: { updateMany: jest.fn() },
        reservation: { update: reservationUpdate },
      };
      prismaMock.$transaction.mockImplementation(
        (fn: (tx: FakeTx) => Promise<unknown>) => fn(fakeTx),
      );

      const result = await repository.confirm('r-1');

      expect(reservationUpdate).toHaveBeenCalled();
      expect(seatUpdate).not.toHaveBeenCalled();
      expect(result).toEqual(confirmedReservation);
    });
  });

  describe('createTicketTypeReservation', () => {
    const params = {
      eventId: 'evt-1',
      userId: 'user-1',
      ticketTypeId: 'tt-1',
    };

    const expectedCreateData = {
      event: { connect: { id: 'evt-1' } },
      user: { connect: { id: 'user-1' } },
      ticketType: { connect: { id: 'tt-1' } },
      status: 'PENDING' as const,
    };

    it('should return null when no availability remains (count 0)', async () => {
      const updateMany = jest.fn().mockResolvedValue({ count: 0 });
      const reservationCreate = jest.fn();
      const fakeTx: FakeTx = {
        ticketType: { updateMany },
        reservation: { create: reservationCreate },
      };
      prismaMock.$transaction.mockImplementation(
        (fn: (tx: FakeTx) => Promise<unknown>) => fn(fakeTx),
      );

      const result = await repository.createTicketTypeReservation(params);

      expect(updateMany).toHaveBeenCalledWith({
        where: { id: 'tt-1', availableCount: { gte: 1 } },
        data: { availableCount: { decrement: 1 } },
      });
      expect(reservationCreate).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should create the reservation when availability remains (count 1)', async () => {
      const updateMany = jest.fn().mockResolvedValue({ count: 1 });
      const ticketTypeReservation = {
        ...mockReservation,
        seatId: null,
        ticketTypeId: 'tt-1',
      };
      const reservationCreate = jest
        .fn()
        .mockResolvedValue(ticketTypeReservation);
      const fakeTx: FakeTx = {
        ticketType: { updateMany },
        reservation: { create: reservationCreate },
      };
      prismaMock.$transaction.mockImplementation(
        (fn: (tx: FakeTx) => Promise<unknown>) => fn(fakeTx),
      );

      const result = await repository.createTicketTypeReservation(params);

      expect(reservationCreate).toHaveBeenCalledWith({
        data: expectedCreateData,
      });
      expect(result).toEqual(ticketTypeReservation);
    });
  });
});
