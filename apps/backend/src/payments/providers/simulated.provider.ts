import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  ChargeInput,
  PaymentProvider,
  PaymentResult,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class SimulatedPaymentProvider implements PaymentProvider {
  charge({ cardNumber }: ChargeInput): Promise<PaymentResult> {
    const last = cardNumber?.trim().slice(-1);
    if (!last || !/\d/.test(last)) {
      throw new BadRequestException('Número de cartão inválido');
    }
    const digit = Number(last);
    return Promise.resolve(
      digit % 2 === 0 ? { status: 'APPROVED' } : { status: 'DECLINED' },
    );
  }
}
