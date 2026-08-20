import { httpClient } from '@/lib/http-client';
import type { PaymentApprovedResponse } from '@elite-dev/shared';

export interface PaginatedTicketsResult {
  items: PaymentApprovedResponse[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export async function getMyTickets(): Promise<PaginatedTicketsResult> {
  const { data } =
    await httpClient.get<PaginatedTicketsResult>('/tickets/mine');
  return data;
}
