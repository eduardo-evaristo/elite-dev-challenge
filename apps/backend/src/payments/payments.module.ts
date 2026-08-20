import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from './interfaces/payment-provider.interface';
import { SimulatedPaymentProvider } from './providers/simulated.provider';

@Module({
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      useFactory: (config: ConfigService): PaymentProvider => {
        const driver = config.get<string>('PAYMENT_PROVIDER') ?? 'simulated';
        switch (driver) {
          case 'simulated':
            return new SimulatedPaymentProvider();
          // case 'asaas': return new AsaasPaymentProvider(config);
          default:
            throw new Error(`Unknown PAYMENT_PROVIDER: ${driver}`);
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
