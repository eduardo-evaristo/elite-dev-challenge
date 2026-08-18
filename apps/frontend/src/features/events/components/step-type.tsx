import { Film, Music } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';

import { cn } from '@/lib/utils';
import type { Step1Data } from '../schemas';

interface StepTypeProps {
  form: UseFormReturn<Step1Data>;
}

const options = [
  {
    value: 'movie' as const,
    Icon: Film,
    title: 'Filme',
    desc: 'Sessões de cinema com assentos nomeados por sala.',
  },
  {
    value: 'show' as const,
    Icon: Music,
    title: 'Show ou evento',
    desc: 'Shows, festivais e eventos com setores de pista.',
  },
];

export function StepType({ form }: StepTypeProps) {
  const selectedType = form.watch('type');

  return (
    <>
      <h2 className='text-[22px] font-semibold text-ink'>
        Que tipo de evento você quer publicar?
      </h2>
      <p className='text-sm text-muted-foreground'>
        Essa escolha define onde vamos buscar os detalhes do evento.
      </p>
      <div className='flex flex-col gap-5 md:flex-row'>
        {options.map((opt) => {
          const isSelected = selectedType === opt.value;
          const { Icon } = opt;
          return (
            <button
              key={opt.value}
              type='button'
              onClick={() =>
                form.setValue('type', opt.value, { shouldValidate: true })
              }
              className={cn(
                'flex flex-1 flex-col gap-4 rounded-md bg-surface px-7 py-6 text-left transition-colors',
                isSelected
                  ? 'border-2 border-curtain'
                  : 'border border-line hover:border-line-strong',
              )}
            >
              <Icon
                className={cn(
                  'size-10',
                  isSelected ? 'text-curtain' : 'text-muted-foreground',
                )}
              />
              <span className='text-xl font-semibold text-ink'>
                {opt.title}
              </span>
              <span className='text-sm text-muted-foreground'>{opt.desc}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
