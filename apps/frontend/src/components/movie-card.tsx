import { cn } from '@/lib/utils';

interface MovieCardProps {
  title: string;
  meta?: string;
  posterUrl?: string | null;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function MovieCard({
  title,
  meta,
  posterUrl,
  selected = false,
  onClick,
  className,
}: MovieCardProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn('group flex w-[200px] flex-col gap-2 text-left', className)}
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
      {meta && <p className='text-xs text-muted-foreground'>{meta}</p>}
    </button>
  );
}
