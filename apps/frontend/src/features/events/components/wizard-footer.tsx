import { cn } from '@/lib/utils';

interface WizardFooterProps {
  onBack: () => void;
  onContinue?: () => void;
  continueDisabled?: boolean;
  backLabel?: string;
  continueLabel?: string;
  continueType?: 'submit' | 'button';
  onSecondaryAction?: () => void;
  secondaryLabel?: string;
  primaryLoading?: boolean;
  secondaryLoading?: boolean;
}

export function WizardFooter({
  onBack,
  onContinue,
  continueDisabled = false,
  backLabel = 'Voltar',
  continueLabel = 'Continuar',
  continueType = 'submit',
  onSecondaryAction,
  secondaryLabel,
  primaryLoading = false,
  secondaryLoading = false,
}: WizardFooterProps) {
  const hasSecondary = onSecondaryAction && secondaryLabel;

  if (hasSecondary) {
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
        <div className='flex gap-3'>
          <button
            type='button'
            onClick={onSecondaryAction}
            disabled={secondaryLoading || primaryLoading}
            className={cn(
              'rounded-md border border-line bg-surface px-5 py-3',
              'text-sm font-semibold text-muted-foreground transition-colors',
              'hover:bg-paper',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {secondaryLoading ? 'Salvando...' : secondaryLabel}
          </button>
          <button
            type={continueType}
            onClick={onContinue}
            disabled={continueDisabled || primaryLoading || secondaryLoading}
            className={cn(
              'rounded-md bg-curtain px-5 py-3',
              'text-sm font-semibold text-white transition-colors',
              'hover:bg-curtain-hover',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {primaryLoading ? 'Publicando...' : continueLabel}
          </button>
        </div>
      </div>
    );
  }

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
