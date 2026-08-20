import { queryOptions } from '@tanstack/react-query';

import { getMyTickets } from './api';

export function myTicketsOptions() {
  return queryOptions({
    queryKey: ['tickets', 'mine'],
    queryFn: getMyTickets,
  });
}
