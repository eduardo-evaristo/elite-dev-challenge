import { queryOptions } from '@tanstack/react-query';

import { getMyTickets, getMyTicket, getPublicTicket } from './api';

export function myTicketsOptions() {
  return queryOptions({
    queryKey: ['tickets', 'mine'],
    queryFn: getMyTickets,
  });
}

export function myTicketOptions(publicId: string) {
  return queryOptions({
    queryKey: ['tickets', 'mine', publicId],
    queryFn: () => getMyTicket(publicId),
    enabled: !!publicId,
  });
}

export function publicTicketOptions(publicId: string) {
  return queryOptions({
    queryKey: ['tickets', 'public', publicId],
    queryFn: () => getPublicTicket(publicId),
    enabled: !!publicId,
  });
}
