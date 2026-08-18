import { useQuery } from '@tanstack/react-query';

import { getMe } from '@/features/auth/api';

export function useGetMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
  });
}
