import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TicketsRepository } from './tickets.repository';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository, PrismaService],
  exports: [TicketsService], // ReservationsModule imports this in the next step
})
export class TicketsModule {}
