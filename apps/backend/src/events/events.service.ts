import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventsRepository } from './events.repository';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { QueryMoviesDto } from './dto/query-movies.dto';
import { AuthenticatedUser } from 'src/auth/auth.types';
import { Role, EventType, EventStatus } from 'src/generated/prisma/enums';

const TYPE_MAP: Record<string, EventType> = {
  movie: 'MOVIE',
  show: 'SHOW',
};

const STATUS_MAP: Record<string, EventStatus> = {
  draft: 'DRAFT',
  published: 'PUBLISHED',
  cancelled: 'CANCELLED',
};

const EVENT_DETAIL_INCLUDE = {
  seats: true,
  ticketTypes: true,
} as const;

interface SeatData {
  id: string;
  row: string;
  number: number;
  status: string;
}

interface TicketTypeData {
  id: string;
  name: string;
  price: { toString(): string };
  capacity: number;
  availableCount: number;
}

interface EventData {
  id: string;
  name: string;
  date: Date;
  location: string;
  type: EventType;
  status: EventStatus;
  externalId: string;
  externalSource: string;
  imageUrl: string | null;
  eventClassification: string;
  description: string | null;
  duration: number;
  organizerId: string;
  createdAt: Date;
  updatedAt: Date;
  seats?: SeatData[];
  ticketTypes?: TicketTypeData[];
}

@Injectable()
export class EventsService {
  constructor(private readonly eventsRepository: EventsRepository) {}

  async findAll(query: QueryEventsDto) {
    const page = query.page;
    const size = query.size;
    const skip = (page - 1) * size;

    let dateFilter = {};
    if (query.date) {
      const target = query.date === 'today' ? new Date() : new Date(query.date);
      const startOfDay = new Date(target);
      startOfDay.setHours(0, 0, 0, 0);
      const startOfNextDay = new Date(startOfDay);
      startOfNextDay.setDate(startOfNextDay.getDate() + 1);
      dateFilter = { date: { gte: startOfDay, lt: startOfNextDay } };
    }

    const where = {
      status: 'PUBLISHED' as const,
      ...(query.type && { type: TYPE_MAP[query.type] }),
      ...(query.query && {
        name: { contains: query.query, mode: 'insensitive' as const },
      }),
      ...dateFilter,
    };

    const [items, totalResults] = await Promise.all([
      this.eventsRepository.findMany({ where, skip, take: size }),
      this.eventsRepository.count(where),
    ]);

    const totalPages = Math.ceil(totalResults / size);

    return {
      items: items.map((e) => this.toEventItem(e as EventData)),
      page,
      totalPages,
      totalResults,
    };
  }

  async findMovies(query: QueryMoviesDto) {
    const groups = await this.groupPublishedMoviesByExternalId();

    const items = Array.from(groups.values()).map((events) =>
      this.toMovieItem(events),
    );

    items.sort(
      (a, b) =>
        new Date(a.nextSessionDate).getTime() -
        new Date(b.nextSessionDate).getTime(),
    );

    const totalResults = items.length;
    const page = query.page;
    const size = query.size;
    const totalPages = Math.ceil(totalResults / size);
    const start = (page - 1) * size;

    return {
      items: items.slice(start, start + size),
      page,
      totalPages,
      totalResults,
    };
  }

  async findMovieSessions(externalId: string) {
    const group = await this.groupPublishedMoviesByExternalId(externalId);
    const events = group.get(externalId);

    if (!events || events.length === 0) {
      throw new NotFoundException(
        `No upcoming movie sessions found for externalId ${externalId}`,
      );
    }

    return this.toMovieSessionsResponse(events);
  }

  private async groupPublishedMoviesByExternalId(externalId?: string) {
    const events = (await this.eventsRepository.findPublishedMoviesFrom(
      new Date(),
      externalId,
    )) as EventData[];

    const groups = new Map<string, EventData[]>();
    for (const event of events) {
      const existing = groups.get(event.externalId);
      if (existing) {
        existing.push(event);
      } else {
        groups.set(event.externalId, [event]);
      }
    }
    return groups;
  }

  private toMovieItem(events: EventData[]) {
    const representative = events[0];
    const nextSessionTime = events
      .map((e) => e.date.getTime())
      .reduce((min, t) => (t < min ? t : min), events[0].date.getTime());

    return {
      externalId: representative.externalId,
      name: representative.name,
      imageUrl: representative.imageUrl,
      description: representative.description,
      eventClassification: representative.eventClassification,
      duration: representative.duration,
      nextSessionDate: new Date(nextSessionTime).toISOString(),
      sessionCount: events.length,
    };
  }

  private toMovieSessionsResponse(events: EventData[]) {
    const representative = events[0];
    const byLocation = new Map<string, { id: string; date: string }[]>();

    for (const event of events) {
      const session = {
        id: event.id,
        date: event.date.toISOString(),
      };
      const existing = byLocation.get(event.location);
      if (existing) {
        existing.push(session);
      } else {
        byLocation.set(event.location, [session]);
      }
    }

    const sessionsByLocation = Array.from(byLocation.entries()).map(
      ([location, sessions]) => ({
        location,
        sessions: sessions.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        ),
      }),
    );

    return {
      externalId: representative.externalId,
      name: representative.name,
      imageUrl: representative.imageUrl,
      description: representative.description,
      eventClassification: representative.eventClassification,
      duration: representative.duration,
      sessionsByLocation,
    };
  }

  async findOne(id: string) {
    const event = await this.eventsRepository.findById(
      id,
      EVENT_DETAIL_INCLUDE,
    );

    if (!event || event.status !== 'PUBLISHED') {
      throw new NotFoundException(`Event with id ${id} not found`);
    }

    return this.toEventDetailResponse(event);
  }

  async create(dto: CreateEventDto, userId: string) {
    const eventType = TYPE_MAP[dto.type];

    if (eventType === 'MOVIE' && (!dto.seats || dto.seats.length === 0)) {
      throw new BadRequestException('MOVIE events must have at least one seat');
    }

    if (
      eventType === 'SHOW' &&
      (!dto.seats || dto.seats.length === 0) &&
      (!dto.ticketTypes || dto.ticketTypes.length === 0)
    ) {
      throw new BadRequestException(
        'SHOW events must have at least one seat or ticket type',
      );
    }

    const data = {
      name: dto.name,
      date: dto.date,
      location: dto.location,
      type: eventType,
      status: dto.status ? STATUS_MAP[dto.status] : ('PUBLISHED' as const),
      externalId: dto.externalId,
      externalSource: dto.externalSource,
      imageUrl: dto.imageUrl,
      eventClassification: dto.eventClassification,
      description: dto.description,
      duration: dto.duration,
      organizer: { connect: { id: userId } },
      ...(dto.seats &&
        dto.seats.length > 0 && {
          seats: {
            create: dto.seats.map((s) => ({ row: s.row, number: s.number })),
          },
        }),
      ...(dto.ticketTypes &&
        dto.ticketTypes.length > 0 && {
          ticketTypes: {
            create: dto.ticketTypes.map((t) => ({
              name: t.name,
              price: t.price,
              capacity: t.capacity,
              availableCount: t.capacity,
            })),
          },
        }),
    };

    const event = await this.eventsRepository.create(
      data,
      EVENT_DETAIL_INCLUDE,
    );

    return this.toEventDetailResponse(event);
  }

  async update(id: string, dto: UpdateEventDto, user: AuthenticatedUser) {
    const event = await this.eventsRepository.findById(id);

    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }

    if (user.role === Role.ORGANIZER && event.organizerId !== user.userId) {
      throw new ForbiddenException('You can only edit your own events');
    }

    const data = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.date !== undefined && { date: dto.date }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.status !== undefined && { status: STATUS_MAP[dto.status] }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      ...(dto.eventClassification !== undefined && {
        eventClassification: dto.eventClassification,
      }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.duration !== undefined && { duration: dto.duration }),
    };

    const updated = await this.eventsRepository.update(id, data);

    return this.toEventItem(updated);
  }

  async remove(id: string, user: AuthenticatedUser) {
    const event = await this.eventsRepository.findById(id);

    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }

    if (user.role === Role.ORGANIZER && event.organizerId !== user.userId) {
      throw new ForbiddenException('You can only delete your own events');
    }

    await this.eventsRepository.update(id, {
      status: { set: 'CANCELLED' },
    });

    return { id, status: 'CANCELLED' as const };
  }

  private toEventItem(event: EventData) {
    return {
      id: event.id,
      name: event.name,
      date: event.date.toISOString(),
      location: event.location,
      type: event.type,
      status: event.status,
      externalId: event.externalId,
      externalSource: event.externalSource,
      imageUrl: event.imageUrl,
      eventClassification: event.eventClassification,
      description: event.description,
      duration: event.duration,
      organizerId: event.organizerId,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }

  private toEventDetailResponse(event: EventData) {
    return {
      ...this.toEventItem(event),
      seats: (event.seats ?? []).map((s) => ({
        id: s.id,
        row: s.row,
        number: s.number,
        status: s.status,
      })),
      ticketTypes: (event.ticketTypes ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        price: Number(t.price),
        capacity: t.capacity,
        availableCount: t.availableCount,
      })),
    };
  }
}
