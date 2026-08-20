import { httpClient } from '@/lib/http-client';
import type {
  PaginatedEventResult,
  ValidateTicketRequest,
  ValidateTicketResponse,
} from '@elite-dev/shared';

export async function getTodayEvents(): Promise<PaginatedEventResult> {
  const { data } = await httpClient.get<PaginatedEventResult>('/events', {
    params: { date: 'today' },
  });
  return data;
}

export async function validateTicket(
  payload: ValidateTicketRequest,
): Promise<ValidateTicketResponse> {
  const { data } = await httpClient.post<ValidateTicketResponse>(
    '/tickets/validate',
    payload,
  );
  return data;
}
