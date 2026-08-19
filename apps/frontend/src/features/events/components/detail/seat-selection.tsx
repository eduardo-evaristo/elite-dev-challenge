import { useState } from 'react';
import { Armchair as SeatIcon } from 'lucide-react';
import type { SeatResponse } from '@elite-dev/shared';

import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { SeatMap } from './seat-map';

interface SeatSelectionProps {
  seats: SeatResponse[];
  price: number;
  contextLabel: string;
  contextDescription?: string;
}

export function SeatSelection({
  seats,
  price,
  contextLabel,
  contextDescription,
}: SeatSelectionProps) {
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(
    new Set(),
  );

  const toggleSeat = (seatId: string) => {
    setSelectedSeatIds((prev) => {
      const next = new Set(prev);
      if (next.has(seatId)) {
        next.delete(seatId);
      } else {
        next.add(seatId);
      }
      return next;
    });
  };

  const selectedSeats = seats.filter((s) => selectedSeatIds.has(s.id));
  const subtotal = selectedSeats.length * price;
  const hasSelection = selectedSeats.length > 0;

  return (
    <section className='flex flex-col gap-12 bg-paper px-5 py-12 md:flex-row md:px-20'>
      <div className='flex flex-col gap-8 md:w-[420px]'>
        <div className='flex flex-col gap-2'>
          <h2 className='text-[20px] font-semibold text-ink'>{contextLabel}</h2>
          {contextDescription && (
            <p className='text-sm text-muted-foreground'>
              {contextDescription}
            </p>
          )}
        </div>

        {hasSelection ? (
          <>
            <div className='flex flex-col gap-2'>
              <h3 className='text-sm font-semibold text-ink'>
                Assento selecionado
              </h3>

              {selectedSeats.map((seat) => (
                <div
                  key={seat.id}
                  className='flex items-center justify-between'
                >
                  <span className='text-sm font-normal text-muted-foreground'>
                    {seat.row}-{seat.number}
                  </span>
                  <span className='text-sm font-semibold text-ink'>
                    {formatCurrency(price)}
                  </span>
                </div>
              ))}
            </div>

            <div className='flex items-center justify-between py-4'>
              <span className='text-base font-semibold text-ink'>Subtotal</span>
              <span className='text-[20px] font-bold text-curtain'>
                {formatCurrency(subtotal)}
              </span>
            </div>
          </>
        ) : (
          <div className='flex flex-col gap-3 px-4 py-6'>
            <SeatIcon className='size-7 text-line-strong' />
            <p className='text-[15px] font-semibold text-ink'>
              Selecione seu assento
            </p>
            <p className='text-[13px] text-muted-foreground'>
              Escolha o assento desejados no mapa para continuar.
            </p>
          </div>
        )}

        <button
          type='button'
          disabled={!hasSelection}
          className={cn(
            'w-fit rounded-md px-8 py-4 text-base font-semibold text-white transition-colors',
            hasSelection
              ? 'bg-curtain hover:bg-curtain-hover'
              : 'cursor-not-allowed bg-line',
          )}
        >
          Comprar ingressos
        </button>
      </div>

      <div className='flex flex-1 flex-col gap-8'>
        <h3 className='text-base font-semibold text-ink'>
          Escolha seu assento
        </h3>
        <div className='flex items-start justify-center'>
          <SeatMap
            seats={seats}
            selectedIds={selectedSeatIds}
            onToggleSeat={toggleSeat}
          />
        </div>
      </div>
    </section>
  );
}
