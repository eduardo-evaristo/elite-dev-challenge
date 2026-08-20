import { httpClient } from '@/lib/http-client';
import type {
  CreateReservationRequest,
  ReservationResponse,
  PayReservationRequest,
  PaymentResultResponse,
} from '@elite-dev/shared';

export async function createReservation(
  payload: CreateReservationRequest,
): Promise<ReservationResponse> {
  const { data } = await httpClient.post<ReservationResponse>(
    '/reservations',
    payload,
  );
  return data;
}

export async function payReservation(
  id: string,
  payload: PayReservationRequest,
): Promise<PaymentResultResponse> {
  const { data } = await httpClient.post<PaymentResultResponse>(
    `/reservations/${id}/pay`,
    payload,
  );
  return data;
}
