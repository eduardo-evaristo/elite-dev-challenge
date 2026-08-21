import { useCallback, useState } from 'react';
import { useNavigate, createFileRoute } from '@tanstack/react-router';

import { Navbar } from '@/components/navbar';
import { Footer } from '@/features/home/components/footer';
import { StepIndicator } from '@/features/checkout/components/step-indicator';
import { OrderSummary } from '@/features/checkout/components/order-summary';
import { BuyerDataForm } from '@/features/checkout/components/buyer-data-form';
import { PaymentForm } from '@/features/checkout/components/payment-form';
import { CountdownTimer } from '@/features/checkout/components/countdown-timer';
import { useEventDetail } from '@/features/events/hooks/use-event-detail';
import { useGetMe } from '@/features/auth/hooks/use-get-me';
import { useCancelReservation } from '@/features/checkout/hooks/use-cancel-reservation';
import { eventDetailOptions } from '@/features/events/queries';
import { toastError } from '@/lib/toast';
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
  const navigate = useNavigate();
  const { data: event } = useEventDetail(search.eventId);
  const { data: user } = useGetMe();
  const [step, setStep] = useState<1 | 2>(1);
  const cancelReservation = useCancelReservation();

  const handleExpired = useCallback(() => {
    const reservationId = search.reservationIds[0];
    const returnTo = `/eventos/${search.eventId}`;

    const navigateAfterCancel = () => {
      sessionStorage.setItem('reservation_expired', '1');
      navigate({ to: returnTo });
    };

    if (reservationId) {
      cancelReservation.mutate(reservationId, {
        onSettled: navigateAfterCancel,
        onError: () => toastError('Erro ao cancelar reserva.'),
      });
    } else {
      navigateAfterCancel();
    }
  }, [search, navigate, cancelReservation]);

  return (
    <div className='flex min-h-screen flex-col bg-paper'>
      <Navbar />

      <main className='mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-12 bg-paper px-5 py-12 md:flex-row md:justify-between md:px-20'>
        <div className='flex w-full flex-col gap-8 md:w-[780px]'>
          {search.expiresAt && (
            <CountdownTimer
              expiresAt={search.expiresAt}
              onExpired={handleExpired}
            />
          )}

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
              reservationIds={search.reservationIds}
              onCancel={handleExpired}
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
