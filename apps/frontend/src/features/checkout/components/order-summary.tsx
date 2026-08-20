import { Calendar, MapPin, Armchair } from 'lucide-react';
import type { EventDetailResponse } from '@elite-dev/shared';

import { formatCurrency } from '@/lib/currency';
import { formatEventDate } from '@/lib/datetime';
import {
  CLASSIFICATION_ICONS,
  normalizeClassification,
} from '@/lib/classification';
import type { CheckoutSearch } from '../schemas';

interface OrderSummaryProps {
  event?: EventDetailResponse;
  search: CheckoutSearch;
}

export function OrderSummary({ event, search }: OrderSummaryProps) {
  const items = buildOrderItems(event, search);
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const seats =
    search.mode === 'seat' && event
      ? search.seatIds
          ?.map((id) => event.seats.find((s) => s.id === id))
          .filter(Boolean)
          .map((s) => `${s!.row}-${s!.number}`)
          .join(', ')
      : null;

  const normalized = event
    ? normalizeClassification(event.eventClassification)
    : undefined;

  return (
    <div className='clip overflow-hidden rounded-md bg-surface'>
      {/* Header — gradient */}
      <div className='flex gap-5 bg-gradient-to-br from-[#1A0A0F] to-[#3E1E2A] px-7 py-6 items-center'>
        <div className='flex flex-1 flex-col gap-4'>
          <h2 className='text-[22px] font-bold text-white'>
            {event?.name ?? 'Evento'}
          </h2>

          {event && (
            <>
              <div className='flex items-center gap-2.5'>
                <MapPin className='size-4 text-white/70' />
                <span className='text-[13px] text-white/80'>
                  {event.location}
                </span>
              </div>

              <div className='flex items-center gap-2.5'>
                <Calendar className='size-4 text-white/70' />
                <span className='text-[13px] text-white/80'>
                  {formatEventDate(event.date)}
                </span>
              </div>

              {normalized && (
                <img
                  src={CLASSIFICATION_ICONS[normalized]}
                  alt={normalized}
                  className='size-9 shrink-0 rounded-md'
                />
              )}
            </>
          )}
        </div>

        {event?.imageUrl && (
          <img
            src={event.imageUrl}
            alt={event.name}
            className='h-[140px] w-[100px] shrink-0 rounded-md object-cover'
          />
        )}
      </div>

      {/* Perforation */}
      <div className='relative h-6 overflow-hidden bg-surface'>
        <div className='absolute -left-3 top-0 size-6 rounded-full bg-paper' />
        <div className='absolute -right-3 top-0 size-6 rounded-full bg-paper' />
        <div className='absolute left-7 right-7 top-[11.5px] border-t border-dashed border-line' />
      </div>

      {/* Body */}
      <div className='flex flex-col gap-4 px-7 py-6'>
        <h3 className='text-sm font-semibold text-ink'>Resumo do pedido</h3>

        <div className='flex flex-col gap-3'>
          {items.map((item) => (
            <div key={item.key} className='flex items-center justify-between'>
              <span className='text-sm text-ink'>{item.label}</span>
              <span className='text-sm font-semibold text-ink'>
                {formatCurrency(item.price)}
              </span>
            </div>
          ))}
        </div>

        <div className='flex items-center justify-between border-t border-line py-4'>
          <span className='text-base font-semibold text-ink'>Total</span>
          <span className='text-[20px] font-bold text-curtain'>
            {formatCurrency(total)}
          </span>
        </div>

        {seats && (
          <div className='flex items-center gap-2.5 border-t border-line pt-3'>
            <Armchair className='size-4 text-muted-foreground' />
            <span className='text-[13px] font-semibold text-ink'>
              Assentos: {seats}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function buildOrderItems(
  event: EventDetailResponse | undefined,
  search: CheckoutSearch,
): Array<{ key: string; label: string; price: number }> {
  if (!event) return [];

  if (search.mode === 'seat' && search.seatIds) {
    return search.seatIds.map((seatId) => {
      const seat = event.seats.find((s) => s.id === seatId);
      return {
        key: seatId,
        label: seat ? `Assento ${seat.row}-${seat.number}` : `Assento`,
        price: search.price,
      };
    });
  }

  if (search.mode === 'ticket' && search.ticketTypeId) {
    const ticketType = event.ticketTypes.find(
      (t) => t.id === search.ticketTypeId,
    );
    return [
      {
        key: search.ticketTypeId,
        label: ticketType?.name ?? 'Ingresso',
        price: search.price,
      },
    ];
  }

  return [];
}
