import { useMemo, useState } from 'react';
import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { meQueryOptions } from '@/features/auth/queries';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { useMyEventsList } from '@/features/events/hooks/use-my-events';
import type { EventStatus } from '@elite-dev/shared';

const myEventsSearchSchema = z.object({
  status: z.enum(['draft', 'published', 'cancelled']).optional(),
  type: z.enum(['movie', 'show']).optional(),
  page: z.number().min(1).default(1),
});

export const Route = createFileRoute('/_authenticated/organizador/eventos/')({
  validateSearch: myEventsSearchSchema,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions);
    if (!user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')) {
      throw redirect({ to: '/' });
    }
  },
  component: MyEventsComponent,
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, '0');
  const months = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year} · ${hours}:${minutes}`;
}

const STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: 'rascunho',
  PUBLISHED: 'publicado',
  CANCELLED: 'cancelado',
};

const STATUS_STYLES: Record<EventStatus, string> = {
  DRAFT: 'bg-paper text-muted-foreground border-line',
  PUBLISHED: 'bg-[#2E6B8414] text-stage border-[#2E6B8433]',
  CANCELLED: 'bg-[#9B253114] text-curtain border-[#9B253133]',
};

const STATUS_SEARCH_TO_EVENT: Record<string, EventStatus> = {
  draft: 'DRAFT',
  published: 'PUBLISHED',
  cancelled: 'CANCELLED',
};

function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2.5 py-1 text-xs font-medium font-sans border ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function MyEventsComponent() {
  const search = Route.useSearch();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMyEventsList({
      status: search.status,
      type: search.type,
      page: search.page,
    });

  const events = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const [filterStatus, setFilterStatus] = useState<EventStatus | undefined>(
    () => (search.status ? STATUS_SEARCH_TO_EVENT[search.status] : undefined),
  );

  return (
    <div className='flex min-h-screen flex-col bg-paper font-sans'>
      <Navbar />
      <main className='flex flex-1 flex-col gap-6 px-6 py-10 md:px-20'>
        <div className='flex items-end justify-between'>
          <div>
            <h1 className='text-[28px] font-bold text-ink font-sans'>
              Meus eventos
            </h1>
            <p className='text-sm text-muted-foreground font-sans'>
              Gerencie seus eventos publicados e rascunhos
            </p>
          </div>
          <Link to='/organizador/eventos/novo' search={{ step: 1 }}>
            <Button className='gap-2 font-sans'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='18'
                height='18'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <path d='M5 12h14' />
                <path d='M12 5v14' />
              </svg>
              Criar evento
            </Button>
          </Link>
        </div>

        <div className='flex gap-2'>
          {(
            [
              { value: undefined, label: 'Todos' },
              { value: 'PUBLISHED' as const, label: 'Publicados' },
              { value: 'DRAFT' as const, label: 'Rascunhos' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.label}
              onClick={() => setFilterStatus(opt.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium font-sans transition-colors ${
                filterStatus === opt.value
                  ? 'bg-curtain text-white'
                  : 'bg-surface text-muted-foreground hover:text-ink'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className='overflow-hidden rounded-md border border-line bg-surface'>
          <table className='w-full font-sans'>
            <thead>
              <tr className='bg-paper'>
                <th className='px-6 py-3.5 text-left text-xs font-semibold tracking-wide text-muted-foreground font-sans'>
                  Evento
                </th>
                <th className='px-6 py-3.5 text-left text-xs font-semibold tracking-wide text-muted-foreground font-sans'>
                  Data
                </th>
                <th className='px-6 py-3.5 text-left text-xs font-semibold tracking-wide text-muted-foreground font-sans'>
                  Tipo
                </th>
                <th className='px-6 py-3.5 text-left text-xs font-semibold tracking-wide text-muted-foreground font-sans'>
                  Status
                </th>
                <th className='px-6 py-3.5 text-right text-xs font-semibold tracking-wide text-muted-foreground font-sans' />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className='border-t border-line'>
                    <td className='px-6 py-4'>
                      <div className='h-4 w-40 animate-pulse rounded bg-paper' />
                    </td>
                    <td className='px-6 py-4'>
                      <div className='h-4 w-32 animate-pulse rounded bg-paper' />
                    </td>
                    <td className='px-6 py-4'>
                      <div className='h-4 w-14 animate-pulse rounded bg-paper' />
                    </td>
                    <td className='px-6 py-4'>
                      <div className='h-6 w-24 animate-pulse rounded bg-paper' />
                    </td>
                    <td className='px-6 py-4' />
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={5} className='px-6 py-16 text-center'>
                    <div className='flex flex-col items-center gap-3'>
                      <p className='text-muted-foreground font-sans'>
                        Nenhum evento encontrado.
                      </p>
                      <Link to='/organizador/eventos/novo' search={{ step: 1 }}>
                        <Button variant='outline' size='sm'>
                          Criar primeiro evento
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                events
                  .filter((e) => !filterStatus || e.status === filterStatus)
                  .map((event) => (
                    <tr key={event.id} className='border-t border-line'>
                      <td className='px-6 py-4 text-sm font-medium text-ink font-sans'>
                        {event.name}
                      </td>
                      <td className='px-6 py-4 text-[13px] text-muted-foreground font-sans'>
                        {formatDate(event.date)}
                      </td>
                      <td className='px-6 py-4 text-[13px] text-muted-foreground font-sans'>
                        {event.type === 'MOVIE' ? 'Filme' : 'Show'}
                      </td>
                      <td className='px-6 py-4'>
                        <StatusBadge status={event.status} />
                      </td>
                      <td className='px-6 py-4 text-right'>
                        <Link
                          to='/organizador/eventos/$id/editar'
                          params={{ id: event.id }}
                          className='text-sm font-semibold text-curtain hover:underline font-sans'
                        >
                          Editar
                        </Link>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        {hasNextPage && (
          <div className='flex justify-center'>
            <Button
              variant='outline'
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
