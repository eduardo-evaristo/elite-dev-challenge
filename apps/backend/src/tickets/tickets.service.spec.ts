import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsRepository } from './tickets.repository';
import { ValidateTicketDto } from './dto/validate-ticket.dto';

const SECRET = 'test-ticket-secret';

const sign = (id: string, eventId: string): string =>
  createHmac('sha256', SECRET).update(`${id}:${eventId}`).digest('hex');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const buildTicket = (overrides: Record<string, unknown> = {}) => ({
  id: 't-1',
  reservationId: 'r-1',
  userId: 'user-1',
  signature: sign('t-1', 'evt-1'),
  usedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  reservation: {
    eventId: 'evt-1',
    event: {
      id: 'evt-1',
      name: 'Show',
      date: new Date('2026-02-02T20:00:00.000Z'),
      location: 'Arena',
    },
    seat: null,
    ticketType: { id: 'tt-1', name: 'Pista' },
  },
  ...overrides,
});

describe('TicketsService', () => {
  let service: TicketsService;
  let repo: { [K in keyof TicketsRepository]: jest.Mock };

  beforeEach(async () => {
    repo = {
      findReservationWithEvent: jest.fn(),
      create: jest.fn(),
      findByPublicId: jest.fn(),
      findManyByUser: jest.fn(),
      countByUser: jest.fn(),
      markUsed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: TicketsRepository, useValue: repo },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue(SECRET) },
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('issueForReservation', () => {
    it('generates a UUID id and a matching HMAC signature', async () => {
      repo.findReservationWithEvent.mockResolvedValue({
        id: 'r-1',
        eventId: 'evt-1',
        userId: 'user-1',
        status: 'CONFIRMED',
      });
      repo.create.mockImplementation((data: { id: string }) =>
        Promise.resolve(buildTicket({ id: data.id })),
      );

      await service.issueForReservation('r-1');

      expect(repo.findReservationWithEvent).toHaveBeenCalledWith('r-1');
      const [data] = repo.create.mock.calls[0] as [
        { id: string; signature: string },
      ];
      expect(data.id).toMatch(UUID_RE);
      expect(data.signature).toBe(sign(data.id, 'evt-1'));
    });

    it('throws NotFound when the reservation does not exist', async () => {
      repo.findReservationWithEvent.mockResolvedValue(null);

      await expect(service.issueForReservation('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findMineOne', () => {
    it('returns the ticket with qrContent for the owner', async () => {
      repo.findByPublicId.mockResolvedValue(buildTicket());

      const result = await service.findMineOne('t-1', 'user-1');

      expect(result).toHaveProperty('qrContent');
      expect(result.id).toBe('t-1');
    });

    it('throws NotFound for a non-existent public id', async () => {
      repo.findByPublicId.mockResolvedValue(null);

      await expect(service.findMineOne('t-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFound (not 403) for a ticket owned by another user', async () => {
      repo.findByPublicId.mockResolvedValue(buildTicket({ userId: 'other' }));

      await expect(service.findMineOne('t-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validate', () => {
    const dto = (
      overrides: Partial<ValidateTicketDto> = {},
    ): ValidateTicketDto => ({
      publicId: 't-1',
      signature: sign('t-1', 'evt-1'),
      ...overrides,
    });

    it('returns VALID and marks used when signature matches and unused', async () => {
      repo.findByPublicId.mockResolvedValue(buildTicket());
      repo.markUsed.mockResolvedValue({ count: 1 });

      const result = await service.validate(dto());

      expect(result).toEqual({ status: 'VALID' });
      expect(repo.markUsed).toHaveBeenCalledWith('t-1');
    });

    it('returns INVALID when the ticket is not found (no existence reveal)', async () => {
      repo.findByPublicId.mockResolvedValue(null);

      const result = await service.validate(dto());

      expect(result).toEqual({ status: 'INVALID' });
      expect(repo.markUsed).not.toHaveBeenCalled();
    });

    it('returns INVALID on a signature mismatch', async () => {
      repo.findByPublicId.mockResolvedValue(buildTicket());

      const result = await service.validate(
        dto({ signature: 'wrong-signature' }),
      );

      expect(result).toEqual({ status: 'INVALID' });
      expect(repo.markUsed).not.toHaveBeenCalled();
    });

    it('returns ALREADY_USED when markUsed affects 0 rows', async () => {
      repo.findByPublicId.mockResolvedValue(buildTicket());
      repo.markUsed.mockResolvedValue({ count: 0 });

      const result = await service.validate(dto());

      expect(result).toEqual({ status: 'ALREADY_USED' });
    });

    it('returns WRONG_EVENT before signature verification', async () => {
      repo.findByPublicId.mockResolvedValue(buildTicket());

      const result = await service.validate(
        dto({ expectedEventId: 'other-evt' }),
      );

      expect(result).toEqual({ status: 'WRONG_EVENT' });
      expect(repo.markUsed).not.toHaveBeenCalled();
    });
  });
});
