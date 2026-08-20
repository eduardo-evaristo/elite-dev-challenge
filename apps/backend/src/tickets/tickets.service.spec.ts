import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsRepository } from './tickets.repository';
import { ValidateTicketDto } from './dto/validate-ticket.dto';

const SECRET = 'test-ticket-secret';

const sign = (id: string, eventId: string): string =>
  createHmac('sha256', SECRET).update(`${id}:${eventId}`).digest('hex');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CODE_RE = /^[A-Z2-9]{8}$/;

const buildTicket = (overrides: Record<string, unknown> = {}) => ({
  id: 't-1',
  reservationId: 'r-1',
  userId: 'user-1',
  signature: sign('t-1', 'evt-1'),
  shortId: 'AB3XK9DM',
  manualCode: '7Q2MZP1T',
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
  user: { name: 'Maria', lastName: 'Silva' },
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
      findByShortId: jest.fn(),
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
    it('generates a UUID id, matching HMAC signature, shortId and manualCode', async () => {
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
        { id: string; signature: string; shortId: string; manualCode: string },
      ];
      expect(data.id).toMatch(UUID_RE);
      expect(data.signature).toBe(sign(data.id, 'evt-1'));
      expect(data.shortId).toHaveLength(8);
      expect(data.manualCode).toHaveLength(8);
      expect(data.shortId).toMatch(CODE_RE);
      expect(data.manualCode).toMatch(CODE_RE);
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
      expect(result).toHaveProperty('shortId');
      expect(result).toHaveProperty('manualCode');
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

      expect(result).toEqual({
        status: 'VALID',
        holderName: 'Maria Silva',
        ticketLabel: 'Pista',
      });
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
      const usedAtDate = new Date('2026-02-02T21:08:00.000Z');
      repo.findByPublicId.mockResolvedValue(
        buildTicket({ usedAt: usedAtDate }),
      );
      repo.markUsed.mockResolvedValue({ count: 0 });

      const result = await service.validate(dto());

      expect(result).toEqual({
        status: 'ALREADY_USED',
        holderName: 'Maria Silva',
        usedAt: usedAtDate.toISOString(),
      });
    });

    it('returns WRONG_EVENT before signature verification', async () => {
      repo.findByPublicId.mockResolvedValue(buildTicket());

      const result = await service.validate(
        dto({ expectedEventId: 'other-evt' }),
      );

      expect(result).toEqual({
        status: 'WRONG_EVENT',
        ticketEventName: 'Show',
      });
      expect(repo.markUsed).not.toHaveBeenCalled();
    });

    it('returns VALID via manual entry (shortId + manualCode)', async () => {
      repo.findByShortId.mockResolvedValue(buildTicket());
      repo.markUsed.mockResolvedValue({ count: 1 });

      const result = await service.validate({
        manualEntryCode: 'AB3XK9DM-7Q2MZP1T',
        expectedEventId: 'evt-1',
      });

      expect(result).toEqual({
        status: 'VALID',
        holderName: 'Maria Silva',
        ticketLabel: 'Pista',
      });
      expect(repo.findByShortId).toHaveBeenCalledWith(
        'AB3XK9DM',
        expect.anything(),
      );
      expect(repo.findByPublicId).not.toHaveBeenCalled();
    });

    it('returns INVALID via manual entry when manualCode mismatches', async () => {
      repo.findByShortId.mockResolvedValue(buildTicket());

      const result = await service.validate({
        manualEntryCode: 'AB3XK9DM-WRONGCODE',
        expectedEventId: 'evt-1',
      });

      expect(result).toEqual({ status: 'INVALID' });
    });

    it('returns INVALID via manual entry when format is wrong', async () => {
      const result = await service.validate({
        manualEntryCode: 'NODASH',
        expectedEventId: 'evt-1',
      });

      expect(result).toEqual({ status: 'INVALID' });
    });

    it('throws BadRequestException when signature is provided without publicId', async () => {
      await expect(service.validate({ signature: 'some-sig' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
