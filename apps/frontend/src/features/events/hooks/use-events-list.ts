import { useInfiniteQuery } from '@tanstack/react-query';
import type { CatalogType } from '@elite-dev/shared';

import { eventsInfiniteListOptions } from '../queries';

export function useEventsList(type: CatalogType) {
  return useInfiniteQuery(eventsInfiniteListOptions(type));
}
