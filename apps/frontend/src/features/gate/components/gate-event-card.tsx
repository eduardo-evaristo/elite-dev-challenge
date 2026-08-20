import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EventItem } from '@elite-dev/shared';

interface GateEventCardProps {
  event: EventItem;
  onSelect: () => void;
  className?: string;
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function GateEventCard({
  event,
  onSelect,
  className,
}: GateEventCardProps) {
  return (
    <button
      type='button'
      onClick={onSelect}
      className={cn(
        'w-full rounded-md border border-[#D8D2C4] bg-white p-5 text-left transition-colors hover:bg-muted cursor-pointer',
        className,
      )}
    >
      <h3 className='text-[18px] font-semibold text-ink'>{event.name}</h3>
      <div className='mt-1 flex items-center gap-1.5'>
        <Clock className='size-3.5 text-muted-foreground' />
        <span className='text-[14px] text-muted-foreground'>
          {formatTime(event.date)} · {event.location}
        </span>
      </div>
    </button>
  );
}
