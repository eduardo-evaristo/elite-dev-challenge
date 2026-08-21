import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type {
  EventCreateInput,
  EventUpdateInput,
  EventWhereInput,
  EventModel,
  EventInclude,
} from '../generated/prisma/models';

@Injectable()
export class EventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: EventCreateInput, include?: EventInclude): Promise<EventModel> {
    return this.prisma.event.create({ data, include });
  }

  findById(id: string, include?: EventInclude): Promise<EventModel | null> {
    return this.prisma.event.findUnique({ where: { id }, include });
  }

  findMany(params: {
    where: EventWhereInput;
    skip: number;
    take: number;
    include?: EventInclude;
  }): Promise<EventModel[]> {
    return this.prisma.event.findMany(params);
  }

  count(where: EventWhereInput): Promise<number> {
    return this.prisma.event.count({ where });
  }

  findPublishedMoviesFrom(
    now: Date,
    externalId?: string,
  ): Promise<EventModel[]> {
    return this.prisma.event.findMany({
      where: {
        type: 'MOVIE',
        status: 'PUBLISHED',
        date: { gte: now },
        ...(externalId && { externalId }),
      },
    });
  }

  update(id: string, data: EventUpdateInput): Promise<EventModel> {
    return this.prisma.event.update({ where: { id }, data });
  }

  async deleteTicketTypes(eventId: string): Promise<void> {
    await this.prisma.ticketType.deleteMany({ where: { eventId } });
  }

  createTicketTypes(
    eventId: string,
    ticketTypes: {
      name: string;
      price: number;
      capacity: number;
      availableCount: number;
    }[],
  ) {
    return this.prisma.ticketType.createMany({
      data: ticketTypes.map((t) => ({ ...t, eventId })),
    });
  }
}
