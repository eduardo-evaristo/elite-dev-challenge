import { useQuery } from '@tanstack/react-query';

import { movieSessionsOptions } from '../queries';

export function useMovieSessions(externalId: string) {
  return useQuery(movieSessionsOptions(externalId));
}
