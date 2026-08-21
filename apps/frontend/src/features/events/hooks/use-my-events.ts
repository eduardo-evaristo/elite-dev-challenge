import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { myEventsListOptions, eventForEditOptions } from '../queries';

export function useMyEventsList(params: {
  page?: number;
  query?: string;
  type?: 'movie' | 'show';
  status?: string;
}) {
  return useInfiniteQuery(myEventsListOptions(params));
}

export function useEventForEdit(id: string) {
  return useQuery(eventForEditOptions(id));
}
