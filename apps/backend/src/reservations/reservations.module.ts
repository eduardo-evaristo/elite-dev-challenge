import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { ReservationsRepository } from './reservations.repository';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationsRepository, PrismaService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
