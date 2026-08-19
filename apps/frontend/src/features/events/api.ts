import type {
  CreateEventRequest,
  EventDetailResponse,
  PaginatedEventResult,
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

export async function listEvents(params: {
  type: 'movie' | 'show';
  page?: number;
  size?: number;
  query?: string;
}): Promise<PaginatedEventResult> {
  const { data } = await httpClient.get<PaginatedEventResult>('/events', {
    params: {
      type: params.type,
      page: params.page ?? 1,
      size: params.size ?? 20,
      query: params.query,
    },
  });
  return data;
}
