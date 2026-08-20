import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  MapPin,
  Calendar,
  Armchair,
  Share2,
  Check,
  Ticket,
} from 'lucide-react';
import type {
  PaymentApprovedResponse,
  PublicTicketResponse,
} from '@elite-dev/shared';

import { cn } from '@/lib/utils';
import { formatTicketEventDate } from '@/lib/datetime';

interface TicketDetailCardProps {
  ticket: PaymentApprovedResponse | PublicTicketResponse;
  mode: 'owner' | 'public';
  className?: string;
}

export function TicketDetailCard({
  ticket,
  mode,
  className,
}: TicketDetailCardProps) {
  const [copied, setCopied] = useState(false);

  const isOwner = mode === 'owner';
  const hasQr = isOwner && 'qrContent' in ticket;

  const shortId = ticket.reservationId.slice(-8).toUpperCase();
  const shareUrl = `${window.location.origin}/ingressos/${ticket.id}`;

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Seu ingresso',
          text: `Ingresso: ${ticket.event.name}`,
          url: shareUrl,
        });
      } catch {
        // user cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[460px] overflow-hidden rounded-md border border-line bg-surface',
        className,
      )}
    >
      <div
        className='flex flex-col items-center gap-2 p-6 md:p-8'
        style={{ background: 'linear-gradient(135deg, #1A0A0F, #3E1E2A)' }}
      >
        <h2 className='text-center text-lg font-bold text-white md:text-xl'>
          {ticket.event.name}
        </h2>
      </div>

      <div className='relative flex h-6 items-center'>
        <div className='absolute left-0 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper' />
        <div className='absolute right-0 top-1/2 size-6 -translate-y-1/2 translate-x-1/2 rounded-full bg-paper' />
        <div className='mx-8 h-px flex-1 border-t border-dashed border-line' />
      </div>

      <div className='flex flex-col gap-3 px-6 pb-6 pt-4 md:px-8'>
        <div className='flex flex-col gap-2.5'>
          <div className='flex items-center gap-2.5'>
            <MapPin className='size-4 shrink-0 text-muted-foreground' />
            <span className='text-[13px] text-ink'>
              {ticket.event.location}
            </span>
          </div>

          <div className='flex items-center gap-2.5'>
            <Calendar className='size-4 shrink-0 text-muted-foreground' />
            <span className='text-[13px] text-ink'>
              {formatTicketEventDate(ticket.event.date)}
            </span>
          </div>

          {ticket.ticketType && (
            <div className='flex items-center gap-2.5'>
              <Ticket className='size-4 shrink-0 text-muted-foreground' />
              <span className='text-[13px] text-ink'>
                {ticket.ticketType.name}
              </span>
            </div>
          )}

          {ticket.seat && (
            <div className='flex items-center gap-2.5'>
              <Armchair className='size-4 shrink-0 text-muted-foreground' />
              <span className='text-[13px] text-ink'>
                Assento: {ticket.seat.row}-{ticket.seat.number}
              </span>
            </div>
          )}
        </div>

        {hasQr && (
          <>
            <div className='my-1 h-px bg-line' />

            <p className='text-center text-[13px] text-muted-foreground'>
              Apresente para a entrada
            </p>

            <div className='mx-auto flex size-[220px] items-center justify-center rounded-md border border-line bg-white p-2'>
              <QRCodeSVG
                value={(ticket as PaymentApprovedResponse).qrContent}
                size={196}
                bgColor='#FFFFFF'
                fgColor='#221F1C'
                level='M'
                marginSize={0}
              />
            </div>
          </>
        )}

        {!hasQr && !isOwner && (
          <div
            className={cn(
              'mx-auto inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold',
              ticket.used
                ? 'bg-line text-muted-foreground'
                : 'bg-curtain text-white',
            )}
          >
            {ticket.used ? 'Utilizado' : 'Válido'}
          </div>
        )}

        {!hasQr && isOwner && (
          <p className='text-center text-sm text-muted-foreground'>
            Ingresso já utilizado
          </p>
        )}

        <p className='text-center text-[14px] font-semibold text-ink'>
          Pedido #{shortId}
        </p>

        {isOwner && (
          <button
            type='button'
            onClick={handleShare}
            className='mx-auto flex items-center gap-2 rounded-md border border-line bg-white px-5 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-muted'
          >
            {copied ? (
              <>
                <Check className='size-4' />
                Link copiado!
              </>
            ) : (
              <>
                <Share2 className='size-4' />
                Compartilhar ingresso
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
