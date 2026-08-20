import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ManualEntryProps {
  onSubmit: (manualEntryCode: string) => void;
  disabled: boolean;
}

export function ManualEntry({ onSubmit, disabled }: ManualEntryProps) {
  const [value, setValue] = useState('');

  function handleSubmit() {
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (cleaned.length === 16) {
      const formatted = `${cleaned.slice(0, 8)}-${cleaned.slice(8)}`;
      onSubmit(formatted);
      setValue('');
    }
  }

  const canSubmit = !disabled && value.replace(/[^A-Z0-9]/gi, '').length === 16;

  return (
    <div className='flex flex-col gap-3 border-t border-line bg-white py-5 px-4'>
      <p className='text-[13px] text-muted-foreground'>
        Ou digite o código manualmente
      </p>
      <div className='flex items-center gap-[10px]'>
        <input
          type='text'
          placeholder='Código do ingresso'
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          className={cn(
            'flex-1 rounded-md border border-line bg-[#F5F4F0] px-[14px] py-[14px] text-[15px] text-ink placeholder:text-[#A89E8E] focus:outline-none focus:ring-1 focus:ring-ring',
          )}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
          disabled={disabled}
        />
        <button
          type='button'
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            'rounded-md bg-[#9B2531] py-[14px] px-[18px] text-[15px] font-semibold text-white transition-colors cursor-pointer',
            !canSubmit && 'opacity-50 cursor-not-allowed',
          )}
        >
          Validar
        </button>
      </div>
    </div>
  );
}
