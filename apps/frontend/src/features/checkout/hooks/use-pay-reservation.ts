import { useMutation, useQueryClient } from '@tanstack/react-query';

import { payReservation } from '../api';

export function usePayReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cardNumber }: { id: string; cardNumber: string }) =>
      payReservation(id, { cardNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
