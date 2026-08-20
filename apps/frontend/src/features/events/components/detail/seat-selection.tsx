import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { isAxiosError } from 'axios';
import { Armchair as SeatIcon } from 'lucide-react';
import type { SeatResponse } from '@elite-dev/shared';

import { useGetMe } from '@/features/auth/hooks/use-get-me';
import { useCreateReservation } from '@/features/checkout/hooks/use-create-reservation';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { SeatMap } from './seat-map';

interface SeatSelectionProps {
  eventId: string;
  seats: SeatResponse[];
  price: number;
  contextLabel: string;
  contextDescription?: string;
}

export function SeatSelection({
  eventId,
  seats,
  price,
  contextLabel,
  contextDescription,
}: SeatSelectionProps) {
  const navigate = useNavigate();
  const { data: user } = useGetMe();
  const createReservation = useCreateReservation();
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(
    new Set(),
  );
  const [error, setError] = useState<string | null>(null);

  const toggleSeat = (seatId: string) => {
    setError(null);
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
  const isReserving = createReservation.isPending;

  const handleBuyClick = async () => {
    if (!user) {
      navigate({
        to: '/login',
        search: { redirect: window.location.href },
      });
      return;
    }

    if (!hasSelection || isReserving) return;

    setError(null);
    const seatIdList = [...selectedSeatIds];
    const reservationIds: string[] = [];

    for (const seatId of seatIdList) {
      try {
        const res = await createReservation.mutateAsync({
          eventId,
          seatId,
        });
        reservationIds.push(res.id);
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 409) {
          setError('Este assento acabou de ser reservado por outra pessoa.');
          return;
        }
        setError('Erro ao reservar assentos. Tente novamente.');
        return;
      }
    }

    navigate({
      to: '/checkout',
      search: {
        eventId,
        mode: 'seat',
        seatIds: seatIdList,
        price,
        reservationIds,
      },
    });
  };

  const buttonLabel = !user
    ? 'Faça login para comprar'
    : isReserving
      ? 'Reservando...'
      : 'Comprar ingressos';

  const buttonDisabled = !user ? false : !hasSelection || isReserving;

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

        {error && <p className='text-sm font-medium text-red-500'>{error}</p>}

        <button
          type='button'
          disabled={buttonDisabled}
          onClick={handleBuyClick}
          className={cn(
            'w-fit rounded-md px-8 py-4 text-base font-semibold text-white transition-colors',
            buttonDisabled && !isReserving
              ? 'cursor-not-allowed bg-line'
              : 'bg-curtain hover:bg-curtain-hover',
          )}
        >
          {buttonLabel}
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
