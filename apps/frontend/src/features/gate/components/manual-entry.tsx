import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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

  return (
    <div className='flex flex-col gap-2 px-4 py-3'>
      <p className='text-[13px] text-muted-foreground'>
        Ou digite o código manualmente
      </p>
      <div className='flex gap-2'>
        <Input
          type='text'
          placeholder='Código do ingresso'
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          className='flex-1 font-mono text-[15px] tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal'
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
          disabled={disabled}
        />
        <Button
          type='button'
          onClick={handleSubmit}
          disabled={disabled || value.replace(/[^A-Z0-9]/gi, '').length !== 16}
          className='px-5'
        >
          Validar
        </Button>
      </div>
    </div>
  );
}
