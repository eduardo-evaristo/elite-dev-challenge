export type CatalogType = 'movie' | 'show';

export type ExternalSource = 'TMDB' | 'TICKETMASTER';

export interface CatalogItem {
  externalId: string;
  externalSource: ExternalSource;
  type: CatalogType;
  title: string;
  overview: string;
  posterUrl: string | null;
  date: string | null;
  rating?: number;
  venue?: string;
  externalUrl?: string;
}

export interface CatalogItemDetail extends CatalogItem {
  runtime?: number;
  genres?: string[];
  tagline?: string;
  city?: string;
  priceRange?: { min: number; max: number; currency: string };
}

export interface SearchParams {
  query?: string;
  page?: number;
  size?: number;
}

export interface CatalogSearchParams extends SearchParams {
  type: CatalogType;
}

export interface PaginatedCatalogResult {
  items: CatalogItem[];
  page: number;
  totalPages: number;
  totalResults: number;
}
