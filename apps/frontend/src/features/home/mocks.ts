export interface MockMovie {
  id: string;
  title: string;
  meta: string;
}

export interface MockEvent {
  id: string;
  title: string;
  date: string;
  venue: string;
  category: string;
}

export const mockMovies: MockMovie[] = [
  {
    id: 'movie-1',
    title: 'O amor não tira férias',
    meta: '2h 15min · 14 anos',
  },
];

export const mockEvents: MockEvent[] = [
  {
    id: 'event-1',
    title: 'Festival de Jazz',
    date: 'Sáb, 15 de mar',
    venue: 'Teatro Municipal',
    category: 'Música',
  },
];
