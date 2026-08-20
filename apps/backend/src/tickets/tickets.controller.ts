import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { ValidateTicketDto } from './dto/validate-ticket.dto';
import { QueryMyTicketsDto } from './dto/query-my-tickets.dto';
import { Roles } from 'src/common/roles.decorator';
import { RolesGuard } from 'src/common/roles.guard';
import { Role } from 'src/generated/prisma/enums';
import JwtGuard from 'src/auth/guards/jwt.guard';
import type { AuthenticatedUser } from 'src/auth/auth.types';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // Static segments MUST come before :publicId so GET /tickets/mine is not
  // captured as publicId="mine". Mirrors events.controller.ts (movies/:id).
  @Get('mine')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CLIENT)
  findMine(
    @Query() query: QueryMyTicketsDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.ticketsService.findMine(req.user.userId, query);
  }

  @Get('mine/:publicId')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CLIENT)
  findMineOne(
    @Param('publicId') publicId: string,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.ticketsService.findMineOne(publicId, req.user.userId);
  }

  // Public (shareable link). No guard. Returns metadata + `used` only.
  @Get(':publicId')
  findOne(@Param('publicId') publicId: string) {
    return this.ticketsService.findOne(publicId);
  }

  // Different verb, no ordering conflict with :publicId.
  @Post('validate')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.GATE, Role.ADMIN)
  validate(@Body() dto: ValidateTicketDto) {
    return this.ticketsService.validate(dto);
  }
}
