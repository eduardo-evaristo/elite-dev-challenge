import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { TicketsRepository } from './tickets.repository';
import { ValidateTicketDto } from './dto/validate-ticket.dto';
import { QueryMyTicketsDto } from './dto/query-my-tickets.dto';
import type { TicketInclude, TicketModel } from '../generated/prisma/models';

const TICKET_INCLUDE: TicketInclude = {
  reservation: { include: { event: true, seat: true, ticketType: true } },
};

const VALIDATE_INCLUDE: TicketInclude = {
  reservation: { include: { event: true, seat: true, ticketType: true } },
  user: { select: { name: true, lastName: true } },
};

const UNAMBIGUOUS_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

type ValidateTicketResponse =
  | { status: 'VALID'; holderName: string; ticketLabel: string }
  | { status: 'ALREADY_USED'; holderName: string; usedAt: string }
  | { status: 'INVALID' }
  | { status: 'WRONG_EVENT'; ticketEventName: string };

interface EventData {
  id: string;
  name: string;
  date: Date;
  location: string;
}

interface SeatData {
  id: string;
  row: string;
  number: number;
}

interface TicketTypeData {
  id: string;
  name: string;
}

interface UserData {
  name: string;
  lastName: string;
}

interface ReservationData {
  eventId: string;
  event: EventData;
  seat: SeatData | null;
  ticketType: TicketTypeData | null;
}

interface TicketData {
  id: string;
  reservationId: string;
  userId: string;
  signature: string;
  shortId: string;
  manualCode: string;
  usedAt: Date | null;
  createdAt: Date;
  reservation: ReservationData;
  user: UserData;
}

@Injectable()
export class TicketsService {
  private readonly ticketSecret: string;

  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly configService: ConfigService,
  ) {
    this.ticketSecret = this.configService.getOrThrow<string>('TICKET_SECRET');
  }

  async issueForReservation(reservationId: string) {
    const reservation =
      await this.ticketsRepository.findReservationWithEvent(reservationId);
    if (!reservation) {
      throw new NotFoundException(`Reserva ${reservationId} não encontrada`);
    }
    const id = randomUUID();
    const signature = this.signTicket(id, reservation.eventId);
    const shortId = this.generateCode(8);
    const manualCode = this.generateCode(8);
    const ticket = await this.ticketsRepository.create(
      {
        id,
        reservation: { connect: { id: reservation.id } },
        user: { connect: { id: reservation.userId } },
        signature,
        shortId,
        manualCode,
      },
      TICKET_INCLUDE,
    );
    return this.toResponse(ticket, { withQr: true });
  }

  async findMine(userId: string, query: QueryMyTicketsDto) {
    const page = query.page ?? 1;
    const size = query.size ?? 20;
    const [items, total] = await Promise.all([
      this.ticketsRepository.findManyByUser(userId, {
        skip: (page - 1) * size,
        take: size,
        include: TICKET_INCLUDE,
      }),
      this.ticketsRepository.countByUser(userId),
    ]);
    return {
      items: items.map((t) => this.toResponse(t, { withQr: true })),
      page,
      totalPages: Math.ceil(total / size) || 1,
      totalResults: total,
    };
  }

  async findMineOne(publicId: string, userId: string) {
    const ticket = await this.ticketsRepository.findByPublicId(
      publicId,
      TICKET_INCLUDE,
    );
    if (!ticket) throw new NotFoundException();
    if (ticket.userId !== userId) throw new NotFoundException();
    return this.toResponse(ticket, { withQr: true });
  }

  async findOne(publicId: string) {
    const ticket = await this.ticketsRepository.findByPublicId(
      publicId,
      TICKET_INCLUDE,
    );
    if (!ticket) throw new NotFoundException();
    return this.toPublicResponse(ticket);
  }

  async validate(dto: ValidateTicketDto): Promise<ValidateTicketResponse> {
    let ticket: TicketModel | null;

    if (dto.signature) {
      if (!dto.publicId) {
        throw new BadRequestException(
          'publicId is required when using signature',
        );
      }
      ticket = await this.ticketsRepository.findByPublicId(
        dto.publicId,
        VALIDATE_INCLUDE,
      );
    } else {
      const parts = dto.manualEntryCode!.split('-');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return { status: 'INVALID' };
      }
      ticket = await this.ticketsRepository.findByShortId(
        parts[0],
        VALIDATE_INCLUDE,
      );
    }

    if (!ticket) return { status: 'INVALID' };

    const data = ticket as unknown as TicketData;
    const eventId = data.reservation.eventId;

    if (dto.expectedEventId && dto.expectedEventId !== eventId) {
      return {
        status: 'WRONG_EVENT',
        ticketEventName: data.reservation.event.name,
      };
    }

    if (dto.signature) {
      const expected = this.signTicket(ticket.id, eventId);
      if (!this.safeEqualHex(expected, dto.signature)) {
        return { status: 'INVALID' };
      }
    } else {
      const manualCode = dto.manualEntryCode!.split('-')[1];
      if (!this.safeEqualStr(data.manualCode, manualCode)) {
        return { status: 'INVALID' };
      }
    }

    const { count } = await this.ticketsRepository.markUsed(ticket.id);
    if (count === 0) {
      return {
        status: 'ALREADY_USED',
        holderName: `${data.user.name} ${data.user.lastName}`,
        usedAt: data.usedAt!.toISOString(),
      };
    }

    const holderName = `${data.user.name} ${data.user.lastName}`;
    const ticketLabel = data.reservation.seat
      ? `Fila ${data.reservation.seat.row}, Assento ${data.reservation.seat.number}`
      : (data.reservation.ticketType?.name ?? 'Ingresso');

    return { status: 'VALID', holderName, ticketLabel };
  }

  private generateCode(length: number): string {
    const chars: string[] = [];
    for (let i = 0; i < length; i++) {
      chars.push(UNAMBIGUOUS_ALPHABET[randomInt(UNAMBIGUOUS_ALPHABET.length)]);
    }
    return chars.join('');
  }

  private signTicket(ticketId: string, eventId: string): string {
    return createHmac('sha256', this.ticketSecret)
      .update(`${ticketId}:${eventId}`)
      .digest('hex');
  }

  private safeEqualHex(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  private safeEqualStr(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  private toQrContent(id: string, signature: string): string {
    return JSON.stringify({ v: 1, id, sig: signature });
  }

  private toResponse(ticket: TicketModel, opts: { withQr: boolean }) {
    const base = this.toPublicResponse(ticket);
    return opts.withQr
      ? {
          ...base,
          signature: ticket.signature,
          qrContent: this.toQrContent(ticket.id, ticket.signature),
          shortId: ticket.shortId,
          manualCode: ticket.manualCode,
        }
      : base;
  }

  private toPublicResponse(ticket: TicketModel) {
    const data = ticket as unknown as TicketData;
    return {
      id: data.id,
      reservationId: data.reservationId,
      userId: data.userId,
      event: {
        id: data.reservation.event.id,
        name: data.reservation.event.name,
        date: data.reservation.event.date.toISOString(),
        location: data.reservation.event.location,
      },
      seat: data.reservation.seat
        ? {
            id: data.reservation.seat.id,
            row: data.reservation.seat.row,
            number: data.reservation.seat.number,
          }
        : null,
      ticketType: data.reservation.ticketType
        ? {
            id: data.reservation.ticketType.id,
            name: data.reservation.ticketType.name,
          }
        : null,
      used: data.usedAt !== null,
      usedAt: data.usedAt ? data.usedAt.toISOString() : null,
      createdAt: data.createdAt.toISOString(),
    };
  }
}
