import { infiniteQueryOptions } from '@tanstack/react-query';
import type { CatalogType } from '@elite-dev/shared';

import { listEvents, listMovies } from './api';

const PAGE_SIZE = 20;

export function eventsInfiniteListOptions(type: CatalogType) {
  return infiniteQueryOptions({
    queryKey: ['events', 'list', type],
    queryFn: ({ pageParam }) =>
      listEvents({ type, page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}

export function moviesInfiniteListOptions() {
  return infiniteQueryOptions({
    queryKey: ['movies', 'list'],
    queryFn: ({ pageParam }) =>
      listMovies({ page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}
