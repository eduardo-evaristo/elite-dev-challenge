import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateEventRequest } from '@elite-dev/shared';

import { updateEvent } from '@/features/events/api';

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEventRequest }) =>
      updateEvent(id, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events', 'mine'] });
      queryClient.invalidateQueries({
        queryKey: ['events', 'edit', variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['events', 'detail', variables.id],
      });
    },
  });
}
