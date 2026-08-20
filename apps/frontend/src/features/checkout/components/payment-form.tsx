import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard } from 'lucide-react';
import { isAxiosError } from 'axios';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { usePayReservation } from '@/features/checkout/hooks/use-pay-reservation';
import { cn } from '@/lib/utils';
import { maskCardNumber, maskExpiry } from '@/lib/masks';
import { cardDataSchema, type CardData } from '../schemas';

interface PaymentFormProps {
  onBack: () => void;
  reservationIds: string[];
}

export function PaymentForm({ onBack, reservationIds }: PaymentFormProps) {
  const navigate = useNavigate();
  const payReservation = usePayReservation();
  const [payError, setPayError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CardData>({
    resolver: zodResolver(cardDataSchema),
  });

  const onSubmit = async (data: CardData) => {
    setPayError(null);
    const cardNumber = data.cardNumber.replace(/\D/g, '');

    for (const id of reservationIds) {
      try {
        const result = await payReservation.mutateAsync({ id, cardNumber });

        if ('status' in result) {
          setPayError('Pagamento recusado. Tente com outro cartão.');
          return;
        }
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 400) {
          setPayError('Pagamento recusado. Tente com outro cartão.');
          return;
        }
        setPayError('Erro ao processar pagamento. Tente novamente.');
        return;
      }
    }

    navigate({ to: '/meus-ingressos' });
  };

  const isPending = payReservation.isPending;

  return (
    <div className='flex flex-col gap-8'>
      <div className='flex flex-col gap-2'>
        <h2 className='text-[22px] font-semibold text-ink'>Pagamento</h2>
        <p className='text-sm text-muted-foreground'>
          Escolha a forma de pagamento e preencha os dados.
        </p>
      </div>

      <div className='flex flex-col gap-5'>
        {/* Payment method — only credit card */}
        <div className='flex gap-3'>
          <div className='flex items-center gap-2.5 rounded-md border-2 border-curtain bg-surface px-4 py-3.5'>
            <CreditCard className='size-5 text-curtain' />
            <span className='text-sm font-semibold text-ink'>
              Cartão de crédito
            </span>
          </div>
        </div>

        {/* Card form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className='flex flex-col gap-5 rounded-lg border border-line bg-surface p-7'
          id='payment-form'
        >
          <h3 className='text-sm font-semibold text-ink'>Dados do cartão</h3>

          <div className='flex flex-col gap-2'>
            <Label
              htmlFor='cardNumber'
              className='text-[13px] font-semibold text-ink'
            >
              Número do cartão
            </Label>
            <Input
              id='cardNumber'
              placeholder='0000.0000.0000.0000'
              className={cn(
                'h-auto border-line bg-paper px-4 py-3 text-[14px] shadow-none',
                errors.cardNumber && 'border-red-500',
              )}
              {...register('cardNumber', {
                onChange: (e) => {
                  setValue('cardNumber', maskCardNumber(e.target.value), {
                    shouldValidate: true,
                  });
                },
              })}
            />
            {errors.cardNumber && (
              <span className='text-xs text-red-500'>
                {errors.cardNumber.message}
              </span>
            )}
          </div>

          <div className='flex gap-5'>
            <div className='flex flex-1 flex-col gap-2'>
              <Label
                htmlFor='expiry'
                className='text-[13px] font-semibold text-ink'
              >
                Validade
              </Label>
              <Input
                id='expiry'
                placeholder='MM/AA'
                className={cn(
                  'h-auto border-line bg-paper px-4 py-3 text-[14px] shadow-none',
                  errors.expiry && 'border-red-500',
                )}
                {...register('expiry', {
                  onChange: (e) => {
                    setValue('expiry', maskExpiry(e.target.value), {
                      shouldValidate: true,
                    });
                  },
                })}
              />
              {errors.expiry && (
                <span className='text-xs text-red-500'>
                  {errors.expiry.message}
                </span>
              )}
            </div>

            <div className='flex flex-1 flex-col gap-2'>
              <Label
                htmlFor='cvv'
                className='text-[13px] font-semibold text-ink'
              >
                CVV
              </Label>
              <Input
                id='cvv'
                placeholder='000'
                maxLength={3}
                inputMode='numeric'
                className={cn(
                  'h-auto border-line bg-paper px-4 py-3 text-[14px] shadow-none',
                  errors.cvv && 'border-red-500',
                )}
                {...register('cvv')}
              />
              {errors.cvv && (
                <span className='text-xs text-red-500'>
                  {errors.cvv.message}
                </span>
              )}
            </div>
          </div>

          <div className='flex flex-col gap-2'>
            <Label
              htmlFor='cardName'
              className='text-[13px] font-semibold text-ink'
            >
              Nome impresso no cartão
            </Label>
            <Input
              id='cardName'
              placeholder='Nome como está no cartão'
              className={cn(
                'h-auto border-line bg-paper px-4 py-3 text-[14px] shadow-none',
                errors.cardName && 'border-red-500',
              )}
              {...register('cardName')}
            />
            {errors.cardName && (
              <span className='text-xs text-red-500'>
                {errors.cardName.message}
              </span>
            )}
          </div>
        </form>
      </div>

      {payError && (
        <p className='text-sm font-medium text-red-500'>{payError}</p>
      )}

      {/* Button row */}
      <div className='flex items-center justify-between'>
        <Button
          type='button'
          variant='outline'
          onClick={onBack}
          className='h-auto rounded-md border-line bg-white px-8 py-4 text-base font-semibold text-muted-foreground shadow-none hover:bg-white focus-visible:ring-0'
        >
          Voltar
        </Button>
        <Button
          type='submit'
          form='payment-form'
          disabled={isPending}
          className='h-auto rounded-md bg-curtain px-8 py-4 text-base font-semibold text-white shadow-none hover:bg-curtain-hover focus-visible:ring-0'
        >
          {isPending ? 'Processando...' : 'Finalizar compra'}
        </Button>
      </div>
    </div>
  );
}
