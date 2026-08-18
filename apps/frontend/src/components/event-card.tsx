import { cn } from '@/lib/utils';

interface EventCardProps {
  title: string;
  date?: string;
  venue: string;
  category: string;
  posterUrl?: string | null;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function EventCard({
  title,
  date,
  venue,
  category,
  posterUrl,
  selected = false,
  onClick,
  className,
}: EventCardProps) {
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
        <span className='absolute left-2 top-2 rounded-sm bg-curtain px-2 py-1 text-[11px] font-semibold text-white'>
          {category}
        </span>
      </div>
      <h3
        className={cn(
          'text-sm font-semibold transition-colors',
          selected ? 'text-curtain' : 'text-ink group-hover:text-curtain',
        )}
      >
        {title}
      </h3>
      {date && <p className='text-xs text-muted-foreground'>{date}</p>}
      <p className='text-xs text-muted-foreground'>{venue}</p>
    </button>
  );
}
