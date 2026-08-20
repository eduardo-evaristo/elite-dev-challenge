import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { CalendarX } from 'lucide-react';

import { GateHeader } from '@/features/gate/components/gate-header';
import { GateEventCard } from '@/features/gate/components/gate-event-card';
import { useTodayEvents } from '@/features/gate/hooks/use-today-events';
import { todayEventsOptions } from '@/features/gate/queries';
import { meQueryOptions } from '@/features/auth/queries';

export const Route = createFileRoute('/_authenticated/portaria')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions);
    if (user?.role !== 'GATE' && user?.role !== 'ADMIN') {
      throw redirect({ to: '/' });
    }
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(todayEventsOptions);
  },
  component: PortariaComponent,
});

function PortariaComponent() {
  const { data } = useTodayEvents();
  const navigate = useNavigate();
  const events = data?.items ?? [];
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className='flex min-h-screen flex-col bg-[#F5F4F0]'>
      <GateHeader />
      <main className='flex w-full max-w-md flex-1 flex-col px-4 py-6 mx-auto'>
        <h1 className='text-[24px] font-bold text-ink'>Eventos de hoje</h1>
        <p className='mt-2 text-[14px] text-muted-foreground capitalize'>
          {dateStr}
        </p>

        {events.length === 0 ? (
          <div className='mt-12 flex flex-col items-center gap-4 rounded-md border border-[#D8D2C4] bg-white p-8'>
            <div className='flex size-14 items-center justify-center rounded-full bg-muted'>
              <CalendarX className='size-7 text-muted-foreground' />
            </div>
            <p className='text-center text-[16px] text-ink'>
              Nenhum evento programado para hoje.
            </p>
          </div>
        ) : (
          <div className='mt-6 flex flex-col gap-3'>
            {events.map((event) => (
              <GateEventCard
                key={event.id}
                event={event}
                onSelect={() =>
                  navigate({
                    to: '/portaria/$eventId/validar',
                    params: { eventId: event.id },
                  })
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
