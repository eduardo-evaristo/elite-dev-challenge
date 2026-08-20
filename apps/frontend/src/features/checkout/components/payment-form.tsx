import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { cardDataSchema, type CardData } from '../schemas';

interface PaymentFormProps {
  onBack: () => void;
  onPay: (cardNumber: string) => void;
  isPending?: boolean;
}

export function PaymentForm({ onBack, onPay, isPending }: PaymentFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CardData>({
    resolver: zodResolver(cardDataSchema),
  });

  const onSubmit = (data: CardData) => {
    onPay(data.cardNumber.replace(/\D/g, ''));
  };

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
              placeholder='0000 0000 0000 0000'
              className={cn(
                'h-auto border-line bg-paper px-4 py-3 text-[14px] shadow-none',
                errors.cardNumber && 'border-red-500',
              )}
              {...register('cardNumber')}
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
                {...register('expiry')}
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
