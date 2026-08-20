import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsRepository } from './reservations.repository';
import { TicketsService } from 'src/tickets/tickets.service';
import { PAYMENT_PROVIDER } from 'src/payments/interfaces/payment-provider.interface';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let repo: { [K in keyof ReservationsRepository]: jest.Mock };
  let paymentProvider: { charge: jest.Mock };
  let ticketsService: { issueForReservation: jest.Mock };

  beforeEach(async () => {
    repo = {
      findSeat: jest.fn(),
      findTicketType: jest.fn(),
      create: jest.fn(),
      createTicketTypeReservation: jest.fn(),
      findByIdWithRelations: jest.fn(),
      confirm: jest.fn(),
      markDeclined: jest.fn(),
      cancel: jest.fn(),
      findExpiredPending: jest.fn(),
    };

    paymentProvider = { charge: jest.fn() };
    ticketsService = { issueForReservation: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: ReservationsRepository, useValue: repo },
        { provide: PAYMENT_PROVIDER, useValue: paymentProvider },
        { provide: TicketsService, useValue: ticketsService },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('pay', () => {
    it('confirms reservation and issues ticket on APPROVED (sector)', async () => {
      repo.findByIdWithRelations.mockResolvedValue({
        id: 'r1',
        userId: 'u1',
        status: 'PENDING',
        ticketType: { price: 150 },
        event: { ticketTypes: [] },
        user: { name: 'João', email: 'joao@test.com' },
      });
      paymentProvider.charge.mockResolvedValue({ status: 'APPROVED' });
      ticketsService.issueForReservation.mockResolvedValue({
        id: 't1',
        signature: 'abc',
      });

      const result = await service.pay('r1', 'u1', '1234567890');

      expect(paymentProvider.charge).toHaveBeenCalledWith(
        expect.objectContaining({
          reservationId: 'r1',
          amount: 150,
          cardNumber: '1234567890',
        }),
      );
      expect(repo.confirm).toHaveBeenCalledWith('r1');
      expect(ticketsService.issueForReservation).toHaveBeenCalledWith('r1');
      expect(result).toEqual({ id: 't1', signature: 'abc' });
    });

    it('marks declined and keeps PENDING on DECLINED (seat)', async () => {
      repo.findByIdWithRelations.mockResolvedValue({
        id: 'r2',
        userId: 'u1',
        status: 'PENDING',
        ticketType: null,
        seatId: 'seat-1',
        event: { ticketTypes: [{ price: 80 }] },
        user: { name: 'João', email: 'joao@test.com' },
      });
      paymentProvider.charge.mockResolvedValue({ status: 'DECLINED' });

      const result = await service.pay('r2', 'u1', '1234567891');

      expect(repo.markDeclined).toHaveBeenCalledWith('r2');
      expect(repo.confirm).not.toHaveBeenCalled();
      expect(ticketsService.issueForReservation).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: 'DECLINED',
        message: 'Pagamento recusado',
      });
    });

    it('computes amount from event ticketTypes for seat-based reservation', async () => {
      repo.findByIdWithRelations.mockResolvedValue({
        id: 'r3',
        userId: 'u1',
        status: 'PENDING',
        ticketType: null,
        seatId: 'seat-1',
        event: { ticketTypes: [{ price: 45 }] },
        user: { name: 'João', email: 'joao@test.com' },
      });
      paymentProvider.charge.mockResolvedValue({ status: 'APPROVED' });
      ticketsService.issueForReservation.mockResolvedValue({ id: 't3' });

      await service.pay('r3', 'u1', '2222');

      expect(paymentProvider.charge).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 45 }),
      );
    });

    it('throws NotFoundException when reservation belongs to another user', async () => {
      repo.findByIdWithRelations.mockResolvedValue({
        id: 'r4',
        userId: 'other-user',
        status: 'PENDING',
        ticketType: { price: 100 },
        event: { ticketTypes: [] },
        user: { name: 'Outro', email: 'outro@test.com' },
      });

      await expect(service.pay('r4', 'u1', '1234')).rejects.toThrow(
        NotFoundException,
      );
      expect(paymentProvider.charge).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when reservation is not PENDING', async () => {
      repo.findByIdWithRelations.mockResolvedValue({
        id: 'r5',
        userId: 'u1',
        status: 'CONFIRMED',
        ticketType: { price: 100 },
        event: { ticketTypes: [] },
        user: { name: 'João', email: 'joao@test.com' },
      });

      await expect(service.pay('r5', 'u1', '1234')).rejects.toThrow(
        BadRequestException,
      );
      expect(paymentProvider.charge).not.toHaveBeenCalled();
    });

    it('throws ConflictException when no price source exists', async () => {
      repo.findByIdWithRelations.mockResolvedValue({
        id: 'r6',
        userId: 'u1',
        status: 'PENDING',
        ticketType: null,
        seatId: 'seat-1',
        event: { ticketTypes: [] },
        user: { name: 'João', email: 'joao@test.com' },
      });

      await expect(service.pay('r6', 'u1', '1234')).rejects.toThrow(
        ConflictException,
      );
      expect(paymentProvider.charge).not.toHaveBeenCalled();
    });

    it('throws InternalServerErrorException on PENDING payment result', async () => {
      repo.findByIdWithRelations.mockResolvedValue({
        id: 'r7',
        userId: 'u1',
        status: 'PENDING',
        ticketType: { price: 100 },
        event: { ticketTypes: [] },
        user: { name: 'João', email: 'joao@test.com' },
      });
      paymentProvider.charge.mockResolvedValue({
        status: 'PENDING',
        externalId: 'ext-1',
      });

      await expect(service.pay('r7', 'u1', '1234')).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(repo.confirm).not.toHaveBeenCalled();
      expect(repo.markDeclined).not.toHaveBeenCalled();
      expect(ticketsService.issueForReservation).not.toHaveBeenCalled();
    });
  });
});
