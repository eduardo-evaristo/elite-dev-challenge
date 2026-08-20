import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';

import { Navbar } from '@/components/navbar';
import { Footer } from '@/features/home/components/footer';
import { useMyTickets } from '@/features/tickets/hooks/use-my-tickets';
import { myTicketsOptions } from '@/features/tickets/queries';
import { IngressoCard } from '@/features/tickets/components/ingresso-card';
import { cn } from '@/lib/utils';

type Tab = 'futuros' | 'passados';

export const Route = createFileRoute('/_authenticated/meus-ingressos')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(myTicketsOptions());
  },
  component: MeusIngressosComponent,
});

function MeusIngressosComponent() {
  const { data, isLoading } = useMyTickets();
  const [activeTab, setActiveTab] = useState<Tab>('futuros');

  const now = new Date();

  const filteredItems = data?.items.filter((ticket) => {
    const eventDate = new Date(ticket.event.date);
    return activeTab === 'futuros'
      ? !ticket.used && eventDate >= now
      : ticket.used || eventDate < now;
  });

  return (
    <div className='flex min-h-screen flex-col bg-paper'>
      <Navbar />

      <main className='mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-5 overflow-hidden bg-paper px-4 py-6 min-h-[640px] md:gap-8 md:px-20 md:py-12'>
        <div className='flex shrink-0 flex-col gap-4 md:flex-row md:items-end md:justify-between'>
          <div className='flex flex-col gap-1'>
            <h1 className='text-2xl font-semibold text-ink md:text-[22px]'>
              Meus ingressos
            </h1>
            <p className='hidden text-sm text-muted-foreground md:block'>
              Seus ingressos comprados e futuros
            </p>
          </div>

          <div className='flex gap-2'>
            <button
              type='button'
              onClick={() => setActiveTab('futuros')}
              className={cn(
                'flex-1 rounded-md px-4 py-2 text-[13px] font-semibold transition-colors md:flex-none',
                activeTab === 'futuros'
                  ? 'bg-curtain text-white hover:bg-curtain-hover'
                  : 'bg-surface border border-line text-muted-foreground hover:bg-paper',
              )}
            >
              Futuros
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('passados')}
              className={cn(
                'flex-1 rounded-md px-4 py-2 text-[13px] font-semibold transition-colors md:flex-none',
                activeTab === 'passados'
                  ? 'bg-curtain text-white hover:bg-curtain-hover'
                  : 'bg-surface border border-line text-muted-foreground hover:bg-paper',
              )}
            >
              Passados
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className='text-sm text-muted-foreground'>
            Carregando ingressos...
          </p>
        ) : !filteredItems?.length ? (
          <div className='flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-6 py-12'>
            <p className='text-[15px] font-semibold text-ink'>
              Nenhum ingresso encontrado
            </p>
            <p className='text-[13px] text-muted-foreground'>
              {activeTab === 'futuros'
                ? 'Você ainda não comprou nenhum ingresso.'
                : 'Nenhum ingresso passado encontrado.'}
            </p>
          </div>
        ) : (
          <div className='flex flex-1 flex-col gap-3 overflow-y-auto md:gap-4'>
            {filteredItems.map((ticket) => (
              <IngressoCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
