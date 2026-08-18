import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { CatalogItem, CatalogType } from '@elite-dev/shared';
import type { RefObject } from 'react';

import { useCatalogSearch } from '@/features/catalog/hooks/use-catalog-search';
import { MovieCard } from '@/components/movie-card';
import { EventCard } from '@/components/event-card';
import { cn } from '@/lib/utils';

interface StepCatalogProps {
  type: CatalogType;
  query: string | undefined;
  externalId: string | undefined;
  onQueryChange: (query: string) => void;
  onSelect: (externalId: string) => void;
  scrollRootRef: RefObject<HTMLDivElement | null>;
}

const DEBOUNCE_MS = 500;

export function StepCatalog({
  type,
  query,
  externalId,
  onQueryChange,
  onSelect,
  scrollRootRef,
}: StepCatalogProps) {
  const [inputValue, setInputValue] = useState(query ?? '');
  const sentinelRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(inputValue, DEBOUNCE_MS);

  useEffect(() => {
    if (debouncedQuery !== (query ?? '')) {
      onQueryChange(debouncedQuery);
    }
  }, [debouncedQuery, query, onQueryChange]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useCatalogSearch(type, query ?? '');

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: scrollRootRef.current, rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, scrollRootRef]);

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <h2 className='text-[22px] font-semibold text-ink'>
        Buscar no catálogo ({type === 'movie' ? 'filmes' : 'eventos'})
      </h2>
      <p className='text-sm text-muted-foreground'>
        {type === 'movie'
          ? 'Encontre o filme para preencher os detalhes automaticamente.'
          : 'Encontre o show ou evento para preencher os detalhes automaticamente.'}
      </p>

      <div className='flex items-center gap-3 rounded-md border border-line bg-surface px-[18px] py-[14px]'>
        <Search className='size-5 text-muted-foreground' />
        <input
          type='text'
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder='Buscar...'
          className='w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted-foreground'
        />
      </div>

      {isLoading ? (
        <div className='grid grid-cols-4 gap-5'>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'animate-pulse rounded-md bg-line',
                type === 'movie' ? 'aspect-[5/7]' : 'aspect-square',
              )}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className='flex items-center justify-center py-16'>
          <p className='text-sm text-muted-foreground'>
            Nenhum resultado encontrado.
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-4 gap-5'>
          {items.map((item) => (
            <CatalogCard
              key={`${item.externalSource}-${item.externalId}`}
              item={item}
              selected={externalId === item.externalId}
              onSelect={onSelect}
            />
          ))}
          <div ref={sentinelRef} className='col-span-full h-1' />
          {isFetchingNextPage && (
            <div className='col-span-full flex items-center justify-center py-4'>
              <span className='text-sm text-muted-foreground'>
                Carregando mais...
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function CatalogCard({
  item,
  selected,
  onSelect,
}: {
  item: CatalogItem;
  selected: boolean;
  onSelect: (externalId: string) => void;
}) {
  if (item.type === 'movie') {
    const meta = item.rating
      ? `${'\u2605'} ${item.rating.toFixed(1)}${
          item.date ? ` \u00b7 ${new Date(item.date).getFullYear()}` : ''
        }`
      : item.date
        ? new Date(item.date).getFullYear().toString()
        : undefined;

    return (
      <MovieCard
        title={item.title}
        meta={meta}
        posterUrl={item.posterUrl}
        selected={selected}
        onClick={() => onSelect(item.externalId)}
        className='w-full'
      />
    );
  }

  return (
    <EventCard
      title={item.title}
      venue={item.venue ?? '—'}
      category='Show'
      posterUrl={item.posterUrl}
      selected={selected}
      onClick={() => onSelect(item.externalId)}
      className='w-full'
    />
  );
}

function useDebounce(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
