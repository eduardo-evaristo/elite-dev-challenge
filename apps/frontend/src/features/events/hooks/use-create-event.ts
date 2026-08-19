import { useMutation } from '@tanstack/react-query';

import { createEvent } from '@/features/events/api';
import type { CreateEventRequest } from '@elite-dev/shared';

export function useCreateEvent() {
  return useMutation({
    mutationFn: (data: CreateEventRequest) => createEvent(data),
  });
}
