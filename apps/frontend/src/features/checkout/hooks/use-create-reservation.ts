import { useMutation } from '@tanstack/react-query';
import type { CreateReservationRequest } from '@elite-dev/shared';

import { createReservation } from '../api';

export function useCreateReservation() {
  return useMutation({
    mutationFn: (payload: CreateReservationRequest) =>
      createReservation(payload),
  });
}
