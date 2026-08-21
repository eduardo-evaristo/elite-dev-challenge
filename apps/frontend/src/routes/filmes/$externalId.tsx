import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { toastError } from '@/lib/toast';

import { Navbar } from '@/components/navbar';
import { Footer } from '@/features/home/components/footer';
import { HeroDetail } from '@/features/events/components/detail/hero-detail';
import { SessionSelection } from '@/features/events/components/detail/session-selection';
import { SeatSelection } from '@/features/events/components/detail/seat-selection';
import { useMovieSessions } from '@/features/events/hooks/use-movie-sessions';
import { useEventDetail } from '@/features/events/hooks/use-event-detail';
import { movieSessionsOptions } from '@/features/events/queries';
import { formatEventDate } from '@/lib/datetime';

export const Route = createFileRoute('/filmes/$externalId')({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      movieSessionsOptions(params.externalId),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { externalId } = Route.useParams();
  const { data: movie, isLoading, isError } = useMovieSessions(externalId);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

  const { data: sessionEvent, isLoading: sessionLoading } = useEventDetail(
    selectedSessionId ?? '',
  );

  useEffect(() => {
    if (sessionStorage.getItem('reservation_expired') === '1') {
      sessionStorage.removeItem('reservation_expired');
      toastError('Sua reserva expirou. Tente novamente.');
    }
  }, []);

  if (isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-paper'>
        <p className='text-muted-foreground'>Carregando...</p>
      </div>
    );
  }

  if (isError || !movie) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-paper'>
        <p className='text-muted-foreground'>Filme não encontrado.</p>
      </div>
    );
  }

  const sessionLocation = movie.sessionsByLocation.find((group) =>
    group.sessions.some((s) => s.id === selectedSessionId),
  )?.location;

  const sessionDate = movie.sessionsByLocation
    .flatMap((g) => g.sessions)
    .find((s) => s.id === selectedSessionId)?.date;

  return (
    <div className='flex min-h-screen flex-col bg-paper'>
      <Navbar />

      <HeroDetail
        variant='movie'
        imageUrl={movie.imageUrl}
        title={movie.name}
        duration={movie.duration}
        classification={movie.eventClassification}
        description={movie.description}
      />

      <SessionSelection
        sessionsByLocation={movie.sessionsByLocation}
        selectedSessionId={selectedSessionId}
        onSelectSession={setSelectedSessionId}
      />

      {selectedSessionId &&
        sessionEvent &&
        !sessionLoading &&
        sessionEvent.seats.length > 0 &&
        sessionEvent.ticketTypes[0]?.price !== undefined && (
          <SeatSelection
            eventId={sessionEvent.id}
            seats={sessionEvent.seats}
            price={sessionEvent.ticketTypes[0].price}
            contextLabel={
              sessionLocation
                ? `Sala — ${sessionLocation}`
                : 'Sessão selecionada'
            }
            contextDescription={
              sessionDate
                ? `${movie.name} · ${formatEventDate(sessionDate)}`
                : undefined
            }
          />
        )}

      <Footer />
    </div>
  );
}
