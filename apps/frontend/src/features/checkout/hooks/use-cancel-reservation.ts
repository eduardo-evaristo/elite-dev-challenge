import { useMutation } from '@tanstack/react-query';

import { cancelReservation } from '../api';

export function useCancelReservation() {
  return useMutation({
    mutationFn: (id: string) => cancelReservation(id),
  });
}
