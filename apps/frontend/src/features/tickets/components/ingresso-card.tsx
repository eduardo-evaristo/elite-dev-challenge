import { MapPin, Calendar, QrCode, Armchair } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import type { PaymentApprovedResponse } from '@elite-dev/shared';

import { cn } from '@/lib/utils';
import { formatEventDate } from '@/lib/datetime';

interface IngressoCardProps {
  ticket: PaymentApprovedResponse;
  className?: string;
}

export function IngressoCard({ ticket, className }: IngressoCardProps) {
  return (
    <Link
      to='/meus-ingressos/$id'
      params={{ id: ticket.id }}
      className={cn(
        'flex overflow-hidden rounded-md border border-line bg-surface transition-colors hover:bg-muted',
        className,
      )}
    >
      <div className='flex flex-1 flex-col gap-1.5 p-4 md:gap-2.5 md:p-6'>
        <div className='flex items-center gap-2'>
          <span
            className={cn(
              'inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-semibold md:text-[11px]',
              ticket.used
                ? 'bg-line text-muted-foreground'
                : 'bg-curtain text-white',
            )}
          >
            {ticket.used ? 'Utilizado' : 'Válido'}
          </span>
          {ticket.ticketType && (
            <span className='text-[11px] text-muted-foreground md:text-xs'>
              {ticket.ticketType.name}
            </span>
          )}
        </div>

        <h3 className='text-[15px] font-semibold text-ink md:text-lg'>
          {ticket.event.name}
        </h3>

        <div className='flex items-center gap-2'>
          <MapPin className='size-3.5 shrink-0 text-muted-foreground md:size-4' />
          <span className='text-xs text-muted-foreground md:text-[13px]'>
            {ticket.event.location}
          </span>
        </div>

        <div className='flex items-center gap-2'>
          <Calendar className='size-3.5 shrink-0 text-muted-foreground md:size-4' />
          <span className='text-xs text-muted-foreground md:text-[13px]'>
            {formatEventDate(ticket.event.date)}
          </span>
        </div>

        {ticket.seat && (
          <div className='flex items-center gap-2'>
            <Armchair className='size-3.5 shrink-0 text-muted-foreground md:size-4' />
            <span className='text-xs text-muted-foreground md:text-[13px]'>
              Assento: {ticket.seat.row}-{ticket.seat.number}
            </span>
          </div>
        )}
      </div>

      <div className='flex w-[52px] flex-col items-center justify-center gap-1.5 border-l border-line p-3.5 md:w-[125px] md:gap-2.5 md:p-6'>
        <QrCode className='size-6 text-ink md:size-9' />
        <span className='text-[10px] font-semibold text-curtain md:text-xs'>
          Ver <span className='hidden md:inline'>ingresso</span>
        </span>
      </div>
    </Link>
  );
}
