import type {
  CreateEventRequest,
  EventDetailResponse,
} from '@elite-dev/shared';

import { httpClient } from '@/lib/http-client';

export async function createEvent(
  payload: CreateEventRequest,
): Promise<EventDetailResponse> {
  const { data } = await httpClient.post<EventDetailResponse>(
    '/events',
    payload,
  );
  return data;
}
