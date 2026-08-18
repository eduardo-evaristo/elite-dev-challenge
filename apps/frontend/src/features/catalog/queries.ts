import { infiniteQueryOptions } from '@tanstack/react-query';
import type { CatalogType } from '@elite-dev/shared';

import { searchCatalog } from './api';

const PAGE_SIZE = 20;

export function catalogInfiniteSearchOptions(type: CatalogType, query: string) {
  return infiniteQueryOptions({
    queryKey: ['catalog', 'search', type, query],
    queryFn: ({ pageParam }) =>
      searchCatalog({ type, query, page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: true,
  });
}
