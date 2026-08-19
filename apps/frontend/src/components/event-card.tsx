import { cn } from '@/lib/utils';
import {
  CLASSIFICATION_ICONS,
  normalizeClassification,
} from '@/lib/classification';

interface EventCardProps {
  title: string;
  date?: string;
  venue: string;
  classification?: string;
  posterUrl?: string | null;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function EventCard({
  title,
  date,
  venue,
  classification,
  posterUrl,
  selected = false,
  onClick,
  className,
}: EventCardProps) {
  const normalized = normalizeClassification(classification);

  return (
    <button
      type='button'
      onClick={onClick}
      className={cn('group flex w-[260px] flex-col gap-2 text-left', className)}
    >
      <div className='relative aspect-square w-full rounded-md bg-line'>
        {posterUrl && (
          <img
            src={posterUrl}
            alt={title}
            className='h-full w-full rounded-md object-cover'
          />
        )}
      </div>
      <h3
        className={cn(
          'text-sm font-semibold transition-colors',
          selected ? 'text-curtain' : 'text-ink group-hover:text-curtain',
        )}
      >
        {title}
      </h3>
      {(normalized || date) && (
        <div className='flex items-center gap-2'>
          {normalized && (
            <img
              src={CLASSIFICATION_ICONS[normalized]}
              alt={normalized}
              className='size-5 shrink-0 rounded-[3px]'
            />
          )}
          {date && <p className='text-xs text-muted-foreground'>{date}</p>}
        </div>
      )}
      <p className='text-xs text-muted-foreground'>{venue}</p>
    </button>
  );
}
