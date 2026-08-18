import type {
  CatalogItemDetail,
  PaginatedCatalogResult,
  SearchParams,
} from '@elite-dev/shared';

export const CATALOG_PROVIDER = Symbol('CATALOG_PROVIDER');

export interface CatalogProvider {
  findAll(params: SearchParams): Promise<PaginatedCatalogResult>;
  findOne(externalId: string): Promise<CatalogItemDetail>;
}
