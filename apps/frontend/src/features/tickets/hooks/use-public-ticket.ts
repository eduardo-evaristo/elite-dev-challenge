import { useQuery } from '@tanstack/react-query';

import { publicTicketOptions } from '../queries';

export function usePublicTicket(publicId: string) {
  return useQuery(publicTicketOptions(publicId));
}
