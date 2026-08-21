import { queryOptions } from '@tanstack/react-query';
import type { Role } from '@elite-dev/shared';

import { listUsers } from './api';

export function usersListOptions(params: {
  page?: number;
  size?: number;
  query?: string;
  role?: Role;
}) {
  return queryOptions({
    queryKey: ['users', 'list', params],
    queryFn: () => listUsers(params),
  });
}
