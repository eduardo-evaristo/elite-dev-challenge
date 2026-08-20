import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { ReservationsRepository } from './reservations.repository';
import { PrismaService } from 'src/prisma.service';
import { TicketsModule } from 'src/tickets/tickets.module';
import { PaymentsModule } from 'src/payments/payments.module';

@Module({
  imports: [TicketsModule, PaymentsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationsRepository, PrismaService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
