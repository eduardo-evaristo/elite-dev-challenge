import { createFileRoute } from '@tanstack/react-router';

import { Footer } from '@/features/home/components/footer';
import { usePublicTicket } from '@/features/tickets/hooks/use-public-ticket';
import { publicTicketOptions } from '@/features/tickets/queries';
import { TicketDetailCard } from '@/features/tickets/components/ticket-detail-card';

export const Route = createFileRoute('/ingressos_/$publicId')({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      publicTicketOptions(params.publicId),
    );
  },
  component: PublicIngressoComponent,
});

function PublicIngressoComponent() {
  const { publicId } = Route.useParams();
  const { data: ticket, isLoading, isError } = usePublicTicket(publicId);

  if (isLoading) {
    return (
      <div className='flex min-h-screen flex-col bg-paper'>
        <div className='flex h-14 items-center px-4 md:h-16 md:px-20'>
          <span className='text-xl font-bold text-ink'>guichê</span>
        </div>
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
        <div className='flex h-14 items-center px-4 md:h-16 md:px-20'>
          <span className='text-xl font-bold text-ink'>guichê</span>
        </div>
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
      <div className='flex h-14 items-center px-4 md:h-16 md:px-20'>
        <span className='text-xl font-bold text-ink'>guichê</span>
      </div>

      <main className='mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 py-6 md:gap-8 md:px-20 md:py-12'>
        <div className='flex flex-col gap-1'>
          <h1 className='text-2xl font-semibold text-ink md:text-[22px]'>
            Ingresso compartilhado
          </h1>
          <p className='hidden text-sm text-muted-foreground md:block'>
            Informações do ingresso compartilhado.
          </p>
        </div>

        <TicketDetailCard ticket={ticket} mode='public' />
      </main>

      <Footer />
    </div>
  );
}
