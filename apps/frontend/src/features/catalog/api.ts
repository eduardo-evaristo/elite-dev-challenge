import { httpClient } from '@/lib/http-client';
import type {
  CatalogItemDetail,
  CatalogSearchParams,
  CatalogType,
  PaginatedCatalogResult,
} from '@elite-dev/shared';

export async function searchCatalog(
  params: CatalogSearchParams,
): Promise<PaginatedCatalogResult> {
  const { data } = await httpClient.get<PaginatedCatalogResult>('/catalog', {
    params: {
      type: params.type,
      query: params.query,
      page: params.page,
      size: params.size,
    },
  });
  return data;
}

export async function getCatalogDetail(
  type: CatalogType,
  externalId: string,
): Promise<CatalogItemDetail> {
  const { data } = await httpClient.get<CatalogItemDetail>(
    `/catalog/${type}/${externalId}`,
  );
  return data;
}
