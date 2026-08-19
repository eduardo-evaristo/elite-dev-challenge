import { useQuery } from '@tanstack/react-query';

import { eventDetailOptions } from '../queries';

export function useEventDetail(id: string) {
  return useQuery(eventDetailOptions(id));
}
