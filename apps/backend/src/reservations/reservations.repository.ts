import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type {
  ReservationCreateInput,
  ReservationModel,
  SeatModel,
  TicketTypeModel,
} from '../generated/prisma/models';

@Injectable()
export class ReservationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSeat(id: string): Promise<SeatModel | null> {
    return this.prisma.seat.findUnique({ where: { id } });
  }

  findTicketType(id: string): Promise<TicketTypeModel | null> {
    return this.prisma.ticketType.findUnique({ where: { id } });
  }

  create(data: ReservationCreateInput): Promise<ReservationModel> {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.create({
        data: { ...data, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      });
      if (data.seat) {
        await tx.seat.update({
          where: { id: (data.seat as { connect: { id: string } }).connect.id },
          data: { status: 'RESERVED' },
        });
      }
      return reservation;
    });
  }

  createTicketTypeReservation(params: {
    eventId: string;
    userId: string;
    ticketTypeId: string;
  }): Promise<ReservationModel | null> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.ticketType.updateMany({
        where: { id: params.ticketTypeId, availableCount: { gte: 1 } },
        data: { availableCount: { decrement: 1 } },
      });
      if (count === 0) return null;
      return tx.reservation.create({
        data: {
          event: { connect: { id: params.eventId } },
          user: { connect: { id: params.userId } },
          ticketType: { connect: { id: params.ticketTypeId } },
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
    });
  }

  findByIdWithRelations(id: string) {
    return this.prisma.reservation.findUnique({
      where: { id },
      include: {
        ticketType: true,
        seat: true,
        event: { include: { ticketTypes: true } },
        user: { select: { name: true, lastName: true, email: true } },
      },
    });
  }

  confirm(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.update({
        where: { id },
        data: { status: 'CONFIRMED', paymentStatus: 'APPROVED' },
      });
      if (reservation.seatId) {
        await tx.seat.update({
          where: { id: reservation.seatId },
          data: { status: 'SOLD' },
        });
      }
      return reservation;
    });
  }

  markDeclined(id: string) {
    return this.prisma.reservation.update({
      where: { id },
      data: { paymentStatus: 'DECLINED' },
    });
  }

  cancel(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      if (reservation.seatId) {
        await tx.seat.update({
          where: { id: reservation.seatId },
          data: { status: 'AVAILABLE' },
        });
      }

      if (reservation.ticketTypeId) {
        await tx.ticketType.updateMany({
          where: { id: reservation.ticketTypeId },
          data: { availableCount: { increment: 1 } },
        });
      }

      return reservation;
    });
  }

  findExpiredPending() {
    return this.prisma.reservation.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
    });
  }
}
