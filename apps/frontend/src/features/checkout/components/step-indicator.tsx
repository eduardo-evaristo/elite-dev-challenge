import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  current: 1 | 2;
}

const steps = [
  { number: 1, label: 'Dados do comprador' },
  { number: 2, label: 'Pagamento' },
] as const;

export function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <div className='flex items-center gap-3'>
      {steps.map((step) => {
        const isActive = step.number === current;
        const isDone = step.number < current;

        return (
          <div key={step.number} className='flex items-center gap-2.5'>
            <div
              className={cn(
                'flex size-7 items-center justify-center rounded-full border',
                isActive && 'border-curtain bg-curtain text-white',
                isDone && 'border-curtain bg-surface text-curtain',
                !isActive &&
                  !isDone &&
                  'border-line bg-surface text-muted-foreground',
              )}
            >
              {isDone ? (
                <Check className='size-3.5' strokeWidth={3} />
              ) : (
                <span className='text-[13px] font-semibold'>{step.number}</span>
              )}
            </div>
            <span
              className={cn(
                'text-sm',
                isActive && 'font-semibold text-ink',
                isDone && 'text-muted-foreground',
                !isActive && !isDone && 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
