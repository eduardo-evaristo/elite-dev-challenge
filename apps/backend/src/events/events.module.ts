import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { EventsRepository } from './events.repository';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [EventsController],
  providers: [EventsService, EventsRepository, PrismaService],
  exports: [EventsService],
})
export class EventsModule {}
