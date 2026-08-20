import { createFileRoute } from '@tanstack/react-router';

import { Navbar } from '@/components/navbar';
import { Footer } from '@/features/home/components/footer';
import { useMyTickets } from '@/features/tickets/hooks/use-my-tickets';

export const Route = createFileRoute('/_authenticated/meus-ingressos')({
  component: MeusIngressosComponent,
});

function MeusIngressosComponent() {
  const { data, isLoading } = useMyTickets();

  return (
    <div className='flex min-h-screen flex-col bg-paper'>
      <Navbar />

      <main className='mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-8 bg-paper px-5 py-12 md:px-20'>
        <h1 className='text-[22px] font-semibold text-ink'>Meus ingressos</h1>

        {isLoading ? (
          <p className='text-sm text-muted-foreground'>
            Carregando ingressos...
          </p>
        ) : !data?.items.length ? (
          <div className='flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-6 py-12'>
            <p className='text-[15px] font-semibold text-ink'>
              Nenhum ingresso encontrado
            </p>
            <p className='text-[13px] text-muted-foreground'>
              Você ainda não comprou nenhum ingresso.
            </p>
          </div>
        ) : (
          <div className='flex flex-col gap-4'>
            {data.items.map((ticket) => (
              <div
                key={ticket.id}
                className='flex flex-col gap-3 rounded-lg border border-line bg-surface p-6 md:flex-row md:items-center md:justify-between'
              >
                <div className='flex flex-col gap-1'>
                  <span className='text-base font-semibold text-ink'>
                    {ticket.event.name}
                  </span>
                  <span className='text-sm text-muted-foreground'>
                    {new Date(ticket.event.date).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <span className='text-sm text-muted-foreground'>
                    {ticket.event.location}
                  </span>
                  {ticket.seat && (
                    <span className='text-sm text-muted-foreground'>
                      Assento: {ticket.seat.row}-{ticket.seat.number}
                    </span>
                  )}
                  {ticket.ticketType && (
                    <span className='text-sm text-muted-foreground'>
                      Setor: {ticket.ticketType.name}
                    </span>
                  )}
                </div>

                <div className='flex flex-col items-start gap-1 md:items-end'>
                  <span
                    className={`text-xs font-semibold ${
                      ticket.used ? 'text-muted-foreground' : 'text-green-600'
                    }`}
                  >
                    {ticket.used ? 'Utilizado' : 'Válido'}
                  </span>
                  <span className='font-mono text-[11px] text-muted-foreground'>
                    {ticket.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
