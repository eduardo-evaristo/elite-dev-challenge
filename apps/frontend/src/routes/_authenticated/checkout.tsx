import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';

import { Navbar } from '@/components/navbar';
import { Footer } from '@/features/home/components/footer';
import { StepIndicator } from '@/features/checkout/components/step-indicator';
import { OrderSummary } from '@/features/checkout/components/order-summary';
import { BuyerDataForm } from '@/features/checkout/components/buyer-data-form';
import { PaymentForm } from '@/features/checkout/components/payment-form';
import { useEventDetail } from '@/features/events/hooks/use-event-detail';
import { useGetMe } from '@/features/auth/hooks/use-get-me';
import { eventDetailOptions } from '@/features/events/queries';
import {
  checkoutSearchSchema,
  type CheckoutSearch,
} from '@/features/checkout/schemas';

export const Route = createFileRoute('/_authenticated/checkout')({
  validateSearch: checkoutSearchSchema,
  loaderDeps: ({ search }) => ({ eventId: search.eventId }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(eventDetailOptions(deps.eventId));
  },
  component: CheckoutComponent,
});

function CheckoutComponent() {
  const search = Route.useSearch() as CheckoutSearch;
  const { data: event } = useEventDetail(search.eventId);
  const { data: user } = useGetMe();
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <div className='flex min-h-screen flex-col bg-paper'>
      <Navbar />

      <main className='mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-12 bg-paper px-5 py-12 md:flex-row md:justify-between md:px-20'>
        <div className='flex w-full flex-col gap-8 md:w-[780px]'>
          <StepIndicator current={step} />

          {step === 1 ? (
            <BuyerDataForm
              defaultName={
                user ? `${user.name} ${user.lastName ?? ''}`.trim() : undefined
              }
              defaultEmail={user?.email}
              onContinue={() => setStep(2)}
            />
          ) : (
            <PaymentForm
              onBack={() => setStep(1)}
              onPay={(cardNumber) => {
                // Stage 2: payReservation per reservationId
                console.log('pay', search.reservationIds, cardNumber);
              }}
            />
          )}
        </div>

        <div className='hidden w-[420px] shrink-0 md:block'>
          <OrderSummary event={event} search={search} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
