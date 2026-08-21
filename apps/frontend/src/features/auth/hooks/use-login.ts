import { useMutation, useQueryClient } from '@tanstack/react-query';

import { login } from '@/features/auth/api';
import type { LoginRequest } from '@/features/auth/api';

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) => login(data),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['me'] });
    },
  });
}
