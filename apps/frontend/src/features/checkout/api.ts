import { httpClient } from '@/lib/http-client';
import type {
  CreateReservationRequest,
  ReservationResponse,
  PayReservationRequest,
  PaymentResultResponse,
  CancelReservationResponse,
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

export async function cancelReservation(
  id: string,
): Promise<CancelReservationResponse> {
  const { data } = await httpClient.post<CancelReservationResponse>(
    `/reservations/${id}/cancel`,
  );
  return data;
}
