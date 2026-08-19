import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { QueryMoviesDto } from './dto/query-movies.dto';
import { Roles } from 'src/common/roles.decorator';
import { RolesGuard } from 'src/common/roles.guard';
import { Role } from 'src/generated/prisma/enums';
import JwtGuard from 'src/auth/guards/jwt.guard';
import type { AuthenticatedUser } from 'src/auth/auth.types';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(@Query() query: QueryEventsDto) {
    return this.eventsService.findAll(query);
  }

  @Get('movies')
  findMovies(@Query() query: QueryMoviesDto) {
    return this.eventsService.findMovies(query);
  }

  @Get('movies/:externalId/sessions')
  findMovieSessions(@Param('externalId') externalId: string) {
    return this.eventsService.findMovieSessions(externalId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  create(
    @Body() dto: CreateEventDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.eventsService.create(dto, req.user.userId);
  }

  @Patch(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.eventsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ORGANIZER, Role.ADMIN)
  remove(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.eventsService.remove(id, req.user);
  }
}
