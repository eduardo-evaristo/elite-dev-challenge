import { cn } from '@/lib/utils';
import { TOTAL_STEPS } from '../schemas';

interface WizardProgressProps {
  step: number;
}

export function WizardProgress({ step }: WizardProgressProps) {
  return (
    <div className='flex items-center justify-between border-b border-line bg-surface px-20 py-4'>
      <span className='text-sm font-semibold text-ink'>
        Passo {step} de {TOTAL_STEPS}
      </span>
      <div className='flex items-center gap-1.5'>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const isActive = i + 1 === step;
          return (
            <div
              key={i}
              className={cn(
                'h-2 rounded-full transition-colors',
                isActive ? 'w-7 bg-curtain' : 'w-2 bg-line',
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
