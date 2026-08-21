import { useState } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

import { QrScanner } from '@/features/gate/components/qr-scanner';
import { ManualEntry } from '@/features/gate/components/manual-entry';
import { ValidationResult } from '@/features/gate/components/validation-result';
import { useValidateTicket } from '@/features/gate/hooks/use-validate-ticket';
import { useEventDetail } from '@/features/events/hooks/use-event-detail';
import { eventDetailOptions } from '@/features/events/queries';
import { meQueryOptions } from '@/features/auth/queries';
import { toastError } from '@/lib/toast';
import type { ValidateTicketResponse } from '@elite-dev/shared';

function formatEventMeta(date: string, location: string): string {
  const time = new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${time} · ${location}`;
}

export const Route = createFileRoute(
  '/_authenticated/portaria/$eventId/validar',
)({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions);
    if (user?.role !== 'GATE' && user?.role !== 'ADMIN') {
      throw redirect({ to: '/portaria' });
    }
  },
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(
        eventDetailOptions(params.eventId),
      );
    } catch (error) {
      console.error('[Portaria] Failed to load event detail:', error);
    }
  },
  component: ValidarComponent,
});

function ValidarComponent() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const { data: event } = useEventDetail(eventId);
  const validate = useValidateTicket();

  const [result, setResult] = useState<ValidateTicketResponse | null>(null);
  const [scannerEnabled, setScannerEnabled] = useState(true);

  function handleScan(id: string, sig: string) {
    setScannerEnabled(false);
    validate.mutate(
      { publicId: id, signature: sig, expectedEventId: eventId },
      {
        onSuccess: (res) => setResult(res),
        onError: () => toastError('Erro ao validar ingresso. Tente novamente.'),
      },
    );
  }

  function handleManualSubmit(code: string) {
    setScannerEnabled(false);
    validate.mutate(
      { manualEntryCode: code, expectedEventId: eventId },
      {
        onSuccess: (res) => setResult(res),
        onError: () => toastError('Erro ao validar ingresso. Tente novamente.'),
      },
    );
  }

  function handleNext() {
    setResult(null);
    setScannerEnabled(true);
  }

  if (result) {
    return (
      <ValidationResult
        result={result}
        eventName={event?.name ?? ''}
        onNext={handleNext}
        onBack={() => navigate({ to: '/portaria' })}
      />
    );
  }

  return (
    <div className='flex min-h-screen flex-col bg-[#F5F4F0]'>
      <header className='flex h-14 items-center gap-3 border-b border-line bg-surface p-4'>
        <button
          type='button'
          onClick={() => navigate({ to: '/portaria' })}
          className='text-ink'
        >
          <ArrowLeft className='size-6' />
        </button>
        <div className='flex w-full flex-col gap-0.5'>
          <span className='text-[15px] font-semibold text-ink'>
            {event?.name}
          </span>
          {event && (
            <span className='text-[13px] text-muted-foreground'>
              {formatEventMeta(event.date, event.location)}
            </span>
          )}
        </div>
      </header>

      <main className='flex flex-1 flex-col'>
        <QrScanner onScan={handleScan} enabled={scannerEnabled} />
        <ManualEntry
          onSubmit={handleManualSubmit}
          disabled={validate.isPending}
        />
      </main>
    </div>
  );
}
