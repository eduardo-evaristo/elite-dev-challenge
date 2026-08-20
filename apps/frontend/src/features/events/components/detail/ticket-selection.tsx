import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { isAxiosError } from 'axios';
import { Ticket as TicketIcon } from 'lucide-react';
import type { TicketTypeResponse } from '@elite-dev/shared';

import { useGetMe } from '@/features/auth/hooks/use-get-me';
import { useCreateReservation } from '@/features/checkout/hooks/use-create-reservation';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface TicketSelectionProps {
  eventId: string;
  ticketTypes: TicketTypeResponse[];
}

export function TicketSelection({
  eventId,
  ticketTypes,
}: TicketSelectionProps) {
  const navigate = useNavigate();
  const { data: user } = useGetMe();
  const createReservation = useCreateReservation();
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const selected = ticketTypes.find((t) => t.id === selectedTicketTypeId);
  const isReserving = createReservation.isPending;

  const handleBuyClick = async () => {
    if (!user) {
      navigate({
        to: '/login',
        search: { redirect: window.location.href },
      });
      return;
    }

    if (!selected || isReserving) return;

    setError(null);

    try {
      const res = await createReservation.mutateAsync({
        eventId,
        ticketTypeId: selectedTicketTypeId!,
      });

      navigate({
        to: '/checkout',
        search: {
          eventId,
          mode: 'ticket',
          ticketTypeId: selectedTicketTypeId!,
          price: selected.price,
          reservationIds: [res.id],
        },
      });
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setError('Este setor acabou de esgotar.');
        return;
      }
      setError('Erro ao reservar ingresso. Tente novamente.');
    }
  };

  const buttonLabel = !user
    ? 'Faça login para comprar'
    : isReserving
      ? 'Reservando...'
      : 'Comprar ingressos';

  const buttonDisabled = !user ? false : !selected || isReserving;

  return (
    <section className='flex flex-col gap-12 bg-paper px-5 py-12 md:flex-row md:px-20'>
      {/* Order Summary — LEFT */}
      <div className='flex flex-col gap-8 md:w-[420px]'>
        <h2 className='text-[20px] font-semibold text-ink'>Resumo da compra</h2>

        {selected ? (
          <>
            <div className='flex flex-col gap-2'>
              <h3 className='text-sm font-semibold text-ink'>
                Ingresso selecionado
              </h3>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-normal text-muted-foreground'>
                  {selected.name}
                </span>
                <span className='text-sm font-semibold text-ink'>
                  {formatCurrency(selected.price)}
                </span>
              </div>
            </div>

            <div className='flex items-center justify-between py-4'>
              <span className='text-base font-semibold text-ink'>Subtotal</span>
              <span className='text-[20px] font-bold text-curtain'>
                {formatCurrency(selected.price)}
              </span>
            </div>
          </>
        ) : (
          <div className='flex flex-col gap-3 px-4 py-6'>
            <TicketIcon className='size-7 text-line-strong' />
            <p className='text-[15px] font-semibold text-ink'>
              Selecione um ingresso
            </p>
            <p className='text-[13px] text-muted-foreground'>
              Escolha um tipo de ingresso para começar sua compra.
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

      {/* Ticket Types — RIGHT */}
      <div className='flex flex-1 flex-col gap-8'>
        <h2 className='text-[24px] font-semibold text-ink'>
          Tipos de ingresso
        </h2>

        <div className='flex flex-col gap-4'>
          {ticketTypes.map((type) => {
            const isSelected = type.id === selectedTicketTypeId;
            return (
              <div
                key={type.id}
                className={cn(
                  'flex items-center gap-4 rounded-md border bg-surface px-6 py-5',
                  isSelected ? 'border-curtain' : 'border-line',
                )}
              >
                <div className='flex flex-1 flex-col gap-1'>
                  <span className='text-base font-bold text-ink'>
                    {type.name}
                  </span>
                  <span className='text-[13px] text-muted-foreground'>
                    {type.availableCount} disponíveis
                  </span>
                  <span className='text-base font-bold text-ink'>
                    {formatCurrency(type.price)}
                  </span>
                </div>

                <button
                  type='button'
                  onClick={() =>
                    setSelectedTicketTypeId(isSelected ? null : type.id)
                  }
                  className='rounded-md bg-curtain px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-curtain-hover'
                >
                  {isSelected ? 'Selecionado' : 'Selecionar'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
