import { useRef } from 'react';
import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';

import { Navbar } from '@/components/navbar';
import { Hero } from '@/features/home/components/hero';
import { Footer } from '@/features/home/components/footer';
import { SectionHeader } from '@/features/home/components/section-header';
import { MovieCard } from '@/components/movie-card';
import { EventCard } from '@/components/event-card';
import { heroSlides } from '@/features/home/constants';
import { useInfiniteScroll } from '@/features/home/hooks/use-infinite-scroll';
import { useEventsList } from '@/features/events/hooks/use-events-list';
import { useMoviesList } from '@/features/events/hooks/use-movies-list';
import {
  eventsInfiniteListOptions,
  moviesInfiniteListOptions,
} from '@/features/events/queries';
import { meQueryOptions } from '@/features/auth/queries';
import { formatDuration, formatEventDate } from '@/lib/datetime';

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions);
    if (user?.role === 'GATE') {
      throw redirect({ to: '/portaria' });
    }
  },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureInfiniteQueryData(moviesInfiniteListOptions()),
      context.queryClient.ensureInfiniteQueryData(
        eventsInfiniteListOptions('show'),
      ),
    ]);
  },
  component: RouteComponent,
});

const MOVIE_SCROLL_AMOUNT = 216;
const EVENT_SCROLL_AMOUNT = 276;

function RouteComponent() {
  const router = useRouter();
  const navigate = useNavigate();
  const moviesRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef<HTMLDivElement>(null);
  const moviesSentinelRef = useRef<HTMLDivElement>(null);
  const eventsSentinelRef = useRef<HTMLDivElement>(null);

  const moviesQuery = useMoviesList();
  const showsQuery = useEventsList('show');

  const movies = moviesQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const shows = showsQuery.data?.pages.flatMap((p) => p.items) ?? [];

  const preloadMovie = (externalId: string) =>
    router.preloadRoute({
      to: '/filmes/$externalId',
      params: { externalId },
    });
  const goMovie = (externalId: string) =>
    navigate({ to: '/filmes/$externalId', params: { externalId } });

  const preloadEvent = (id: string) =>
    router.preloadRoute({ to: '/eventos/$id', params: { id } });
  const goEvent = (id: string) =>
    navigate({ to: '/eventos/$id', params: { id } });

  useInfiniteScroll({
    rootRef: moviesRef,
    sentinelRef: moviesSentinelRef,
    onLoadMore: () => moviesQuery.fetchNextPage(),
    enabled: moviesQuery.hasNextPage && !moviesQuery.isFetchingNextPage,
  });
  useInfiniteScroll({
    rootRef: eventsRef,
    sentinelRef: eventsSentinelRef,
    onLoadMore: () => showsQuery.fetchNextPage(),
    enabled: showsQuery.hasNextPage && !showsQuery.isFetchingNextPage,
  });

  const scrollMovies = (direction: 1 | -1) => {
    moviesRef.current?.scrollBy({
      left: direction * MOVIE_SCROLL_AMOUNT,
      behavior: 'smooth',
    });
  };

  const scrollEvents = (direction: 1 | -1) => {
    eventsRef.current?.scrollBy({
      left: direction * EVENT_SCROLL_AMOUNT,
      behavior: 'smooth',
    });
  };

  return (
    <div className='min-h-screen bg-paper'>
      <Navbar />

      <Hero slides={heroSlides} />

      <section className='flex flex-col gap-4 px-4 py-8 md:gap-6 md:px-20 md:py-12'>
        <SectionHeader
          title='Filmes em cartaz'
          onPrev={() => scrollMovies(-1)}
          onNext={() => scrollMovies(1)}
        />
        <div
          ref={moviesRef}
          className='flex gap-4 overflow-x-auto scrollbar-none'
        >
          {movies.map((item) => (
            <div
              key={item.externalId}
              onMouseEnter={() => preloadMovie(item.externalId)}
              onFocus={() => preloadMovie(item.externalId)}
            >
              <MovieCard
                title={item.name}
                meta={formatDuration(item.duration)}
                classification={item.eventClassification}
                posterUrl={item.imageUrl}
                onClick={() => goMovie(item.externalId)}
              />
            </div>
          ))}
          <div ref={moviesSentinelRef} className='h-1 w-1 shrink-0' />
        </div>
      </section>

      <section className='flex flex-col gap-4 px-4 py-8 md:gap-6 md:px-20 md:py-12'>
        <SectionHeader
          title='Eventos em cartaz'
          onPrev={() => scrollEvents(-1)}
          onNext={() => scrollEvents(1)}
        />
        <div
          ref={eventsRef}
          className='flex gap-4 overflow-x-auto scrollbar-none'
        >
          {shows.map((item) => (
            <div
              key={item.id}
              onMouseEnter={() => preloadEvent(item.id)}
              onFocus={() => preloadEvent(item.id)}
            >
              <EventCard
                title={item.name}
                date={formatEventDate(item.date)}
                venue={item.location}
                classification={item.eventClassification}
                posterUrl={item.imageUrl}
                onClick={() => goEvent(item.id)}
              />
            </div>
          ))}
          <div ref={eventsSentinelRef} className='h-1 w-1 shrink-0' />
        </div>
      </section>

      <Footer />
    </div>
  );
}
