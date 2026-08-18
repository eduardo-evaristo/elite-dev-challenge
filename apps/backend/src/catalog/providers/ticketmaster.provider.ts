import {
  Injectable,
  NotFoundException,
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { CatalogProvider } from '../interfaces/catalog-provider.interface';
import type {
  CatalogItem,
  CatalogItemDetail,
  PaginatedCatalogResult,
  SearchParams,
} from '@elite-dev/shared';

interface TmImage {
  url: string;
  ratio: string;
  width: number;
  fallback?: boolean;
}

interface TmVenue {
  name?: string;
  city?: { name?: string };
}

interface TmPriceRange {
  min: number;
  max: number;
  currency: string;
}

interface TmEvent {
  id: string;
  name: string;
  info?: string;
  dates?: { start?: { localDate?: string } };
  images?: TmImage[];
  url?: string;
  _embedded?: { venues?: TmVenue[] };
  priceRanges?: TmPriceRange[];
}

interface TmEventsResponse {
  _embedded?: { events?: TmEvent[] };
  page?: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

@Injectable()
export class TicketmasterProvider implements CatalogProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('TICKETMASTER_BASE_URL') ??
      'https://app.ticketmaster.com/discovery/v2';
    this.apiKey = this.configService.get<string>('TICKETMASTER_API_KEY') ?? '';
  }

  async findAll(params: SearchParams): Promise<PaginatedCatalogResult> {
    const page = params.page ?? 1;
    const size = params.size ?? 20;
    const hasQuery =
      typeof params.query === 'string' && params.query.trim().length > 0;

    const requestParams: Record<string, string | number> = {
      apikey: this.apiKey,
      size,
      page: page - 1,
      locale: 'pt-br',
    };
    if (hasQuery) requestParams.keyword = params.query as string;

    const data = await this.get<TmEventsResponse>(
      '/events.json',
      requestParams,
    );

    const events = data._embedded?.events ?? [];
    const pageMeta = data.page;

    return {
      items: events.map((e) => this.toCatalogItem(e)),
      page: pageMeta ? pageMeta.number + 1 : page,
      totalPages: pageMeta?.totalPages ?? 0,
      totalResults: pageMeta?.totalElements ?? 0,
    };
  }

  async findOne(externalId: string): Promise<CatalogItemDetail> {
    const data = await this.get<TmEvent>(`/events/${externalId}.json`, {
      apikey: this.apiKey,
      locale: 'pt-br',
    });
    return this.toCatalogItemDetail(data);
  }

  private async get<T>(
    path: string,
    params: Record<string, string | number>,
  ): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(`${this.baseUrl}${path}`, { params }),
      );
      return response.data;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): Error {
    const axiosError = error as AxiosError;
    if (axiosError.response?.status === 404) {
      throw new NotFoundException('Catalog item not found');
    }
    if (axiosError.response) {
      throw new BadGatewayException('Upstream catalog source error');
    }
    throw new ServiceUnavailableException('Catalog source unavailable');
  }

  private pickBestImage(images: TmImage[] | undefined): string | null {
    if (!images || images.length === 0) return null;

    const nonFallback = images.filter((img) => img.fallback !== true);
    const pool = nonFallback.length > 0 ? nonFallback : images;

    const sixteenNine = pool.filter((img) => img.ratio === '16_9');
    const candidates = sixteenNine.length > 0 ? sixteenNine : pool;

    const best = candidates.reduce((acc, img) =>
      img.width > acc.width ? img : acc,
    );
    return best.url;
  }

  private toCatalogItem(e: TmEvent): CatalogItem {
    return {
      externalId: e.id,
      externalSource: 'TICKETMASTER',
      type: 'show',
      title: e.name ?? '',
      overview: e.info ?? '',
      posterUrl: this.pickBestImage(e.images),
      date: e.dates?.start?.localDate ?? null,
      venue: e._embedded?.venues?.[0]?.name,
      externalUrl: e.url,
    };
  }

  private toCatalogItemDetail(e: TmEvent): CatalogItemDetail {
    const priceRange = e.priceRanges?.[0];
    return {
      ...this.toCatalogItem(e),
      city: e._embedded?.venues?.[0]?.city?.name,
      priceRange: priceRange
        ? {
            min: priceRange.min,
            max: priceRange.max,
            currency: priceRange.currency,
          }
        : undefined,
    };
  }
}
