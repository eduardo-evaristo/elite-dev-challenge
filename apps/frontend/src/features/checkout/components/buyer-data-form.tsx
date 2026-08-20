import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { buyerDataSchema, type BuyerData } from '../schemas';

interface BuyerDataFormProps {
  defaultName?: string;
  defaultEmail?: string;
  onContinue: () => void;
}

export function BuyerDataForm({
  defaultName,
  defaultEmail,
  onContinue,
}: BuyerDataFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BuyerData>({
    resolver: zodResolver(buyerDataSchema),
    defaultValues: {
      name: defaultName ?? '',
      email: defaultEmail ?? '',
    },
  });

  const onSubmit = () => {
    onContinue();
  };

  return (
    <div className='flex flex-col gap-8'>
      <div className='flex flex-col gap-2'>
        <h2 className='text-[22px] font-semibold text-ink'>
          Dados do comprador
        </h2>
        <p className='text-sm text-muted-foreground'>
          Precisamos de alguns dados para garantir seu ingresso.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className='flex flex-col gap-5'
        id='buyer-data-form'
      >
        <div className='flex flex-col gap-2'>
          <Label htmlFor='name' className='text-[13px] font-semibold text-ink'>
            Nome completo
          </Label>
          <Input
            id='name'
            placeholder='Seu nome'
            className='h-auto border-line bg-surface px-4 py-3 text-[14px] shadow-none'
            {...register('name')}
          />
          {errors.name && (
            <span className='text-xs text-red-500'>{errors.name.message}</span>
          )}
        </div>

        <div className='flex flex-col gap-2'>
          <Label htmlFor='email' className='text-[13px] font-semibold text-ink'>
            E-mail
          </Label>
          <Input
            id='email'
            type='email'
            placeholder='seu@email.com'
            className='h-auto border-line bg-surface px-4 py-3 text-[14px] shadow-none'
            {...register('email')}
          />
          {errors.email && (
            <span className='text-xs text-red-500'>{errors.email.message}</span>
          )}
        </div>

        <div className='flex gap-5'>
          <div className='flex flex-1 flex-col gap-2'>
            <Label htmlFor='cpf' className='text-[13px] font-semibold text-ink'>
              CPF
            </Label>
            <Input
              id='cpf'
              placeholder='000.000.000-00'
              className='h-auto border-line bg-surface px-4 py-3 text-[14px] shadow-none'
              {...register('cpf')}
            />
            {errors.cpf && (
              <span className='text-xs text-red-500'>{errors.cpf.message}</span>
            )}
          </div>

          <div className='flex flex-1 flex-col gap-2'>
            <Label
              htmlFor='phone'
              className='text-[13px] font-semibold text-ink'
            >
              Telefone
            </Label>
            <Input
              id='phone'
              placeholder='(00) 00000-0000'
              className='h-auto border-line bg-surface px-4 py-3 text-[14px] shadow-none'
              {...register('phone')}
            />
            {errors.phone && (
              <span className='text-xs text-red-500'>
                {errors.phone.message}
              </span>
            )}
          </div>
        </div>
      </form>

      <div className='flex justify-end'>
        <Button
          type='submit'
          form='buyer-data-form'
          className='h-auto rounded-md bg-curtain px-8 py-4 text-base font-semibold text-white shadow-none hover:bg-curtain-hover focus-visible:ring-0'
        >
          Continuar para pagamento
        </Button>
      </div>
    </div>
  );
}
