import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { ReservationsRepository } from './reservations.repository';
import { CreateReservationDto } from './dto/create-reservation.dto';
import type { ReservationModel } from '../generated/prisma/models';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly reservationsRepository: ReservationsRepository,
  ) {}

  async create(dto: CreateReservationDto, userId: string) {
    if (dto.seatId) {
      return this.createSeatReservation(dto.eventId, userId, dto.seatId);
    }
    return this.createTicketTypeReservation(
      dto.eventId,
      userId,
      dto.ticketTypeId as string,
    );
  }

  private async createSeatReservation(
    eventId: string,
    userId: string,
    seatId: string,
  ) {
    // Precondition: input validation (exists? belongs to the event?), NOT a
    // concurrency guard — the guard is Reservation.seatId @unique (P2002 below).
    const seat = await this.reservationsRepository.findSeat(seatId);
    if (!seat) {
      throw new NotFoundException(`Assento ${seatId} não encontrado`);
    }
    if (seat.eventId !== eventId) {
      throw new BadRequestException('Assento não pertence a este evento');
    }
    // Seat.status is intentionally NOT consulted or written here: the single
    // source of truth for seat reservation is Reservation.seatId @unique.
    // SeatStatus exists in the schema but is not kept synchronized (known
    // limitation), so checking AVAILABLE would be always-true dead code.
    try {
      const reservation = await this.reservationsRepository.create({
        event: { connect: { id: eventId } },
        user: { connect: { id: userId } },
        seat: { connect: { id: seatId } },
        status: 'PENDING',
      });
      return this.toResponse(reservation);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Esse assento acabou de ser reservado por outra pessoa',
        );
      }
      throw error;
    }
  }

  private async createTicketTypeReservation(
    eventId: string,
    userId: string,
    ticketTypeId: string,
  ) {
    // Precondition: input validation (exists? belongs to the event?), NOT a
    // concurrency guard — the guard is the atomic availableCount >= 1
    // decrement inside the $transaction (repository).
    const ticketType =
      await this.reservationsRepository.findTicketType(ticketTypeId);
    if (!ticketType) {
      throw new NotFoundException(`Setor ${ticketTypeId} não encontrado`);
    }
    if (ticketType.eventId !== eventId) {
      throw new BadRequestException('Setor não pertence a este evento');
    }

    const reservation =
      await this.reservationsRepository.createTicketTypeReservation({
        eventId,
        userId,
        ticketTypeId,
      });
    if (!reservation) {
      throw new ConflictException('Ingressos esgotados para este setor');
    }
    return this.toResponse(reservation);
  }

  private toResponse(reservation: ReservationModel) {
    return {
      id: reservation.id,
      eventId: reservation.eventId,
      userId: reservation.userId,
      seatId: reservation.seatId,
      ticketTypeId: reservation.ticketTypeId,
      status: reservation.status,
      createdAt: reservation.createdAt.toISOString(),
    };
  }
}
