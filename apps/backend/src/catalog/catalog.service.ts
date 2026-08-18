import { Injectable, BadRequestException } from '@nestjs/common';
import { TmdbProvider } from './providers/tmdb.provider';
import { TicketmasterProvider } from './providers/ticketmaster.provider';
import { CatalogProvider } from './interfaces/catalog-provider.interface';
import type {
  CatalogItemDetail,
  CatalogType,
  PaginatedCatalogResult,
  SearchParams,
} from '@elite-dev/shared';

@Injectable()
export class CatalogService {
  constructor(
    private readonly tmdbProvider: TmdbProvider,
    private readonly ticketmasterProvider: TicketmasterProvider,
  ) {}

  findAll(type: string, params: SearchParams): Promise<PaginatedCatalogResult> {
    return this.getProvider(type).findAll(params);
  }

  findOne(type: string, externalId: string): Promise<CatalogItemDetail> {
    return this.getProvider(type).findOne(externalId);
  }

  private getProvider(type: string): CatalogProvider {
    const normalized = type as CatalogType;
    if (normalized === 'movie') return this.tmdbProvider;
    if (normalized === 'show') return this.ticketmasterProvider;
    throw new BadRequestException(`Invalid catalog type: ${type}`);
  }
}
