import { useRef } from 'react';
import { createFileRoute } from '@tanstack/react-router';

import { Navbar } from '@/components/navbar';
import { Hero } from '@/components/hero';
import { Footer } from '@/components/footer';
import { SectionHeader } from '@/components/section-header';
import { MovieCard } from '@/components/movie-card';
import { EventCard } from '@/components/event-card';
import { mockMovies, mockEvents, mockSlides } from '@/data/mock-home';

export const Route = createFileRoute('/')({
  component: RouteComponent,
});

const MOVIE_SCROLL_AMOUNT = 216;
const EVENT_SCROLL_AMOUNT = 276;

function RouteComponent() {
  const moviesRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef<HTMLDivElement>(null);

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

      <Hero slides={mockSlides} />

      <section className='flex flex-col gap-6 px-20 py-12'>
        <SectionHeader
          title='Filmes em cartaz'
          onPrev={() => scrollMovies(-1)}
          onNext={() => scrollMovies(1)}
        />
        <div
          ref={moviesRef}
          className='flex gap-4 overflow-x-auto scrollbar-none'
        >
          {mockMovies.map((movie) => (
            <MovieCard key={movie.id} title={movie.title} meta={movie.meta} />
          ))}
        </div>
      </section>

      <section className='flex flex-col gap-6 px-20 py-12'>
        <SectionHeader
          title='Eventos em cartaz'
          onPrev={() => scrollEvents(-1)}
          onNext={() => scrollEvents(1)}
        />
        <div
          ref={eventsRef}
          className='flex gap-4 overflow-x-auto scrollbar-none'
        >
          {mockEvents.map((event) => (
            <EventCard
              key={event.id}
              title={event.title}
              date={event.date}
              venue={event.venue}
              category={event.category}
            />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
