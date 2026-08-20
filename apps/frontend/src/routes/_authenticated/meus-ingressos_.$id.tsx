import { createFileRoute } from '@tanstack/react-router';

import { Navbar } from '@/components/navbar';
import { Footer } from '@/features/home/components/footer';
import { useMyTicket } from '@/features/tickets/hooks/use-my-ticket';
import { myTicketOptions } from '@/features/tickets/queries';
import { TicketDetailCard } from '@/features/tickets/components/ticket-detail-card';

export const Route = createFileRoute('/_authenticated/meus-ingressos_/$id')({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(myTicketOptions(params.id));
  },
  component: MeusIngressosIdComponent,
});

function MeusIngressosIdComponent() {
  const { id } = Route.useParams();
  const { data: ticket, isLoading, isError } = useMyTicket(id);

  if (isLoading) {
    return (
      <div className='flex min-h-screen flex-col bg-paper'>
        <Navbar />
        <main className='flex flex-1 items-center justify-center'>
          <p className='text-sm text-muted-foreground'>
            Carregando ingresso...
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className='flex min-h-screen flex-col bg-paper'>
        <Navbar />
        <main className='flex flex-1 items-center justify-center'>
          <p className='text-sm text-muted-foreground'>
            Ingresso não encontrado.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className='flex min-h-screen flex-col bg-paper'>
      <Navbar />

      <main className='mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 py-6 md:gap-8 md:px-20 md:py-12'>
        <div className='flex flex-col gap-1'>
          <h1 className='text-2xl font-semibold text-ink md:text-[22px]'>
            Seu ingresso
          </h1>
          <p className='hidden text-sm text-muted-foreground md:block'>
            Apresente o código abaixo na entrada do evento.
          </p>
        </div>

        <TicketDetailCard ticket={ticket} mode='owner' />
      </main>

      <Footer />
    </div>
  );
}
