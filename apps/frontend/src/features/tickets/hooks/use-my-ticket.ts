import { useQuery } from '@tanstack/react-query';

import { myTicketOptions } from '../queries';

export function useMyTicket(publicId: string) {
  return useQuery(myTicketOptions(publicId));
}
