import { cn } from '@/lib/utils';

interface WizardFooterProps {
  onBack: () => void;
  onContinue?: () => void;
  continueDisabled?: boolean;
  backLabel?: string;
  continueLabel?: string;
  continueType?: 'submit' | 'button';
}

export function WizardFooter({
  onBack,
  onContinue,
  continueDisabled = false,
  backLabel = 'Voltar',
  continueLabel = 'Continuar',
  continueType = 'submit',
}: WizardFooterProps) {
  return (
    <div className='flex items-center justify-between border-t border-line bg-surface px-6 py-4 md:px-20'>
      <button
        type='button'
        onClick={onBack}
        className={cn(
          'rounded-md border border-line bg-surface px-5 py-3',
          'text-sm font-semibold text-muted-foreground transition-colors',
          'hover:bg-paper',
        )}
      >
        {backLabel}
      </button>
      <button
        type={continueType}
        onClick={onContinue}
        disabled={continueDisabled}
        className={cn(
          'rounded-md bg-curtain px-5 py-3',
          'text-sm font-semibold text-white transition-colors',
          'hover:bg-curtain-hover',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {continueLabel}
      </button>
    </div>
  );
}
