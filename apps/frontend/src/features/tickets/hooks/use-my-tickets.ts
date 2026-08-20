import { useQuery } from '@tanstack/react-query';

import { myTicketsOptions } from '../queries';

export function useMyTickets() {
  return useQuery(myTicketsOptions());
}
