import { useMutation } from '@tanstack/react-query';
import { validateTicket } from '../api';
import type { ValidateTicketRequest } from '@elite-dev/shared';

export function useValidateTicket() {
  return useMutation({
    mutationFn: (data: ValidateTicketRequest) => validateTicket(data),
  });
}
