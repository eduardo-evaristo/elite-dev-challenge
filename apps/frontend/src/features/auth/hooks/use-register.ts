import { useMutation, useQueryClient } from '@tanstack/react-query';

import { register } from '@/features/auth/api';
import type { RegisterRequest } from '@/features/auth/api';

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterRequest) => register(data),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['me'] });
    },
  });
}
