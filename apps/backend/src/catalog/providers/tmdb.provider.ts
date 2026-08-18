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

interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
}

interface TmdbReleaseDate {
  certification: string;
  iso_639_1?: string;
  note?: string;
  release_date?: string;
  type?: number;
}

interface TmdbReleaseDatesResponse {
  results: {
    iso_3166_1: string;
    release_dates: TmdbReleaseDate[];
  }[];
}

interface TmdbMovieDetail extends TmdbMovie {
  runtime?: number | null;
  genres?: { id: number; name: string }[];
  tagline?: string;
  release_dates?: TmdbReleaseDatesResponse;
}

interface TmdbMovieListResponse {
  page: number;
  results: TmdbMovie[];
  total_pages: number;
  total_results: number;
}

@Injectable()
export class TmdbProvider implements CatalogProvider {
  private readonly baseUrl: string;
  private readonly imageBaseUrl: string;
  private readonly accessToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('TMDB_BASE_URL') ??
      'https://api.themoviedb.org/3';
    this.imageBaseUrl =
      this.configService.get<string>('TMDB_IMAGE_BASE_URL') ??
      'https://image.tmdb.org/t/p/w500';
    this.accessToken =
      this.configService.get<string>('TMDB_ACCESS_TOKEN') ?? '';
  }

  async findAll(params: SearchParams): Promise<PaginatedCatalogResult> {
    const page = params.page ?? 1;
    const hasQuery =
      typeof params.query === 'string' && params.query.trim().length > 0;
    const endpoint = hasQuery ? '/search/movie' : '/trending/movie/week';

    const requestParams: Record<string, string | number> = {
      page,
      language: 'pt-BR',
    };
    if (hasQuery) requestParams.query = params.query as string;

    const data = await this.get<TmdbMovieListResponse>(endpoint, requestParams);

    return {
      items: (data.results ?? []).map((m) => this.toCatalogItem(m)),
      page: data.page ?? page,
      totalPages: data.total_pages ?? 1,
      totalResults: data.total_results ?? 0,
    };
  }

  async findOne(externalId: string): Promise<CatalogItemDetail> {
    const data = await this.get<TmdbMovieDetail>(`/movie/${externalId}`, {
      language: 'pt-BR',
      append_to_response: 'release_dates',
    });
    return this.toCatalogItemDetail(data);
  }

  private async get<T>(
    path: string,
    params?: Record<string, string | number>,
  ): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(`${this.baseUrl}${path}`, {
          headers: { Authorization: `Bearer ${this.accessToken}` },
          params,
        }),
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

  private toCatalogItem(m: TmdbMovie): CatalogItem {
    return {
      externalId: String(m.id),
      externalSource: 'TMDB',
      type: 'movie',
      title: m.title ?? '',
      overview: m.overview ?? '',
      posterUrl: m.poster_path ? `${this.imageBaseUrl}${m.poster_path}` : null,
      date: m.release_date ?? null,
      rating: m.vote_average,
    };
  }

  private toCatalogItemDetail(m: TmdbMovieDetail): CatalogItemDetail {
    const brRelease = m.release_dates?.results?.find(
      (r) => r.iso_3166_1 === 'BR',
    );
    const certification =
      brRelease?.release_dates?.[0]?.certification || undefined;

    return {
      ...this.toCatalogItem(m),
      runtime: m.runtime ?? undefined,
      genres: m.genres?.map((g) => g.name),
      tagline: m.tagline || undefined,
      certification,
    };
  }
}
