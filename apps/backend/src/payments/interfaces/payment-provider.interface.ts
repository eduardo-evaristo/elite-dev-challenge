export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface Customer {
  name: string;
  email: string;
}

export interface ChargeInput {
  reservationId: string;
  amount: number;
  cardNumber: string;
  customer: Customer;
}

export type PaymentResult =
  | { status: 'APPROVED' }
  | { status: 'DECLINED' }
  | { status: 'PENDING'; externalId: string };

export interface PaymentProvider {
  charge(input: ChargeInput): Promise<PaymentResult>;
}
