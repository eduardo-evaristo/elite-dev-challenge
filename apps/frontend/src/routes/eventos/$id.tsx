import { createFileRoute } from '@tanstack/react-router';

import { Navbar } from '@/components/navbar';
import { Footer } from '@/features/home/components/footer';
import { HeroDetail } from '@/features/events/components/detail/hero-detail';
import { DescriptionSection } from '@/features/events/components/detail/description-section';
import { TicketSelection } from '@/features/events/components/detail/ticket-selection';
import { SeatSelection } from '@/features/events/components/detail/seat-selection';
import { useEventDetail } from '@/features/events/hooks/use-event-detail';
import { eventDetailOptions } from '@/features/events/queries';

export const Route = createFileRoute('/eventos/$id')({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(eventDetailOptions(params.id));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { data: event, isLoading, isError } = useEventDetail(id);

  if (isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-paper'>
        <p className='text-muted-foreground'>Carregando...</p>
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-paper'>
        <p className='text-muted-foreground'>Evento não encontrado.</p>
      </div>
    );
  }

  const isSeated = event.seats.length > 0;
  const isStanding = event.ticketTypes.length > 0 && event.seats.length === 0;
  const basePrice = event.ticketTypes[0]?.price;

  return (
    <div className='flex min-h-screen flex-col bg-paper'>
      <Navbar />

      <HeroDetail
        variant='event'
        imageUrl={event.imageUrl}
        title={event.name}
        date={event.date}
        duration={event.duration}
        location={event.location}
        classification={event.eventClassification}
      />

      <DescriptionSection description={event.description} price={basePrice} />

      {isSeated && basePrice !== undefined && (
        <SeatSelection
          seats={event.seats}
          price={basePrice}
          contextLabel={event.name}
          contextDescription={`${event.location}`}
        />
      )}

      {isStanding && <TicketSelection ticketTypes={event.ticketTypes} />}

      <Footer />
    </div>
  );
}
