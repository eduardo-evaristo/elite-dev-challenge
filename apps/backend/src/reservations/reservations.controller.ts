import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { PayReservationDto } from './dto/pay-reservation.dto';
import { Roles } from 'src/common/roles.decorator';
import { RolesGuard } from 'src/common/roles.guard';
import { Role } from 'src/generated/prisma/enums';
import JwtGuard from 'src/auth/guards/jwt.guard';
import type { AuthenticatedUser } from 'src/auth/auth.types';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CLIENT)
  create(
    @Body() dto: CreateReservationDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.reservationsService.create(dto, req.user.userId);
  }

  @Post(':id/pay')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CLIENT)
  pay(
    @Param('id') id: string,
    @Body() dto: PayReservationDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.reservationsService.pay(id, req.user.userId, dto.cardNumber);
  }
}
