import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type {
  ReservationModel,
  TicketCreateInput,
  TicketInclude,
  TicketModel,
} from '../generated/prisma/models';

@Injectable()
export class TicketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: TicketCreateInput,
    include?: TicketInclude,
  ): Promise<TicketModel> {
    return this.prisma.ticket.create({ data, include });
  }

  findByPublicId(
    id: string,
    include?: TicketInclude,
  ): Promise<TicketModel | null> {
    return this.prisma.ticket.findUnique({ where: { id }, include });
  }

  findManyByUser(
    userId: string,
    params: { skip: number; take: number; include?: TicketInclude },
  ): Promise<TicketModel[]> {
    return this.prisma.ticket.findMany({
      where: { userId },
      skip: params.skip,
      take: params.take,
      include: params.include,
      orderBy: { createdAt: 'desc' },
    });
  }

  countByUser(userId: string): Promise<number> {
    return this.prisma.ticket.count({ where: { userId } });
  }

  // Single-winner concurrency guard: where { id, usedAt: null } makes exactly
  // one concurrent call affect the row (count=1); others see usedAt already set
  // (count=0). A single atomic write — no $transaction needed.
  markUsed(id: string): Promise<{ count: number }> {
    return this.prisma.ticket.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  findReservationWithEvent(
    reservationId: string,
  ): Promise<Pick<
    ReservationModel,
    'id' | 'eventId' | 'userId' | 'status'
  > | null> {
    return this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, eventId: true, userId: true, status: true },
    });
  }
}
