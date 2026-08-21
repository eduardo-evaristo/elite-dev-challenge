import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { logout } from '@/features/auth/api';
import { toastError } from '@/lib/toast';

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(['me'], null);
      navigate({ to: '/' });
    },
    onError: () => {
      toastError('Erro ao sair. Tente novamente.');
    },
  });
}
