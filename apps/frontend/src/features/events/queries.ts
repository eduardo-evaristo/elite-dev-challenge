import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import type { CatalogType } from '@elite-dev/shared';

import {
  getEventDetail,
  getEventForEdit,
  getMovieSessions,
  listEvents,
  listMovies,
  listMyEvents,
} from './api';

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

export function myEventsListOptions(params: {
  page?: number;
  query?: string;
  type?: 'movie' | 'show';
  status?: string;
}) {
  return infiniteQueryOptions({
    queryKey: ['events', 'mine', params],
    queryFn: ({ pageParam }) =>
      listMyEvents({ ...params, page: pageParam, size: PAGE_SIZE }),
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

export function eventDetailOptions(id: string) {
  return queryOptions({
    queryKey: ['events', 'detail', id],
    queryFn: () => getEventDetail(id),
    enabled: !!id,
  });
}

export function eventForEditOptions(id: string) {
  return queryOptions({
    queryKey: ['events', 'edit', id],
    queryFn: () => getEventForEdit(id),
    enabled: !!id,
  });
}

export function movieSessionsOptions(externalId: string) {
  return queryOptions({
    queryKey: ['movies', 'sessions', externalId],
    queryFn: () => getMovieSessions(externalId),
    enabled: !!externalId,
  });
}
