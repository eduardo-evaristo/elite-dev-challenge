import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { SearchCatalogDto } from './dto/search-catalog.dto';
import { Roles } from 'src/common/roles.decorator';
import { RolesGuard } from 'src/common/roles.guard';
import { Role } from 'src/generated/prisma/enums';
import JwtGuard from 'src/auth/guards/jwt.guard';

@Controller('catalog')
@UseGuards(JwtGuard, RolesGuard)
@Roles(Role.ORGANIZER, Role.ADMIN)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  findAll(@Query() dto: SearchCatalogDto) {
    return this.catalogService.findAll(dto.type, {
      query: dto.query,
      page: dto.page ?? 1,
      size: dto.size ?? 20,
    });
  }

  @Get(':type/:externalId')
  findOne(
    @Param('type') type: string,
    @Param('externalId') externalId: string,
  ) {
    return this.catalogService.findOne(type, externalId);
  }
}
