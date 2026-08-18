import { queryOptions } from '@tanstack/react-query';
import { getMe } from './api';

export const meQueryOptions = queryOptions({
  queryKey: ['me'],
  queryFn: getMe,
  retry: false,
});
