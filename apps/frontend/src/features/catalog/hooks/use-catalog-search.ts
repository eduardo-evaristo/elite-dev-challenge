import { useInfiniteQuery } from '@tanstack/react-query';
import type { CatalogType } from '@elite-dev/shared';

import { catalogInfiniteSearchOptions } from '../queries';

export function useCatalogSearch(type: CatalogType, query: string) {
  return useInfiniteQuery(catalogInfiniteSearchOptions(type, query));
}
