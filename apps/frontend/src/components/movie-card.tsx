import { cn } from '@/lib/utils';
import {
  CLASSIFICATION_ICONS,
  normalizeClassification,
} from '@/lib/classification';

interface MovieCardProps {
  title: string;
  meta?: string;
  classification?: string;
  posterUrl?: string | null;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function MovieCard({
  title,
  meta,
  classification,
  posterUrl,
  selected = false,
  onClick,
  className,
}: MovieCardProps) {
  const normalized = normalizeClassification(classification);

  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'group flex w-[150px] flex-col gap-2 text-left sm:w-[170px] md:w-[200px]',
        className,
      )}
    >
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={title}
          className='aspect-[5/7] w-full rounded-md object-cover'
        />
      ) : (
        <div className='aspect-[5/7] w-full rounded-md bg-line' />
      )}
      <h3
        className={cn(
          'text-sm font-semibold transition-colors',
          selected ? 'text-curtain' : 'text-ink group-hover:text-curtain',
        )}
      >
        {title}
      </h3>
      {(normalized || meta) && (
        <div className='flex items-center gap-1.5'>
          {normalized && (
            <img
              src={CLASSIFICATION_ICONS[normalized]}
              alt={normalized}
              className='size-5 shrink-0 rounded-[3px]'
            />
          )}
          {meta && <p className='text-xs text-muted-foreground'>{meta}</p>}
        </div>
      )}
    </button>
  );
}
