import { useQuery } from '@tanstack/react-query';
import { meQueryOptions } from '../queries';

export function useGetMe() {
  return useQuery(meQueryOptions);
}
