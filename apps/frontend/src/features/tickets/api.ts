import { httpClient } from '@/lib/http-client';
import type {
  PaymentApprovedResponse,
  PublicTicketResponse,
} from '@elite-dev/shared';

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

export async function getMyTicket(
  publicId: string,
): Promise<PaymentApprovedResponse> {
  const { data } = await httpClient.get<PaymentApprovedResponse>(
    `/tickets/mine/${publicId}`,
  );
  return data;
}

export async function getPublicTicket(
  publicId: string,
): Promise<PublicTicketResponse> {
  const { data } = await httpClient.get<PublicTicketResponse>(
    `/tickets/${publicId}`,
  );
  return data;
}
