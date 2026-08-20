import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GateHeaderProps {
  className?: string;
}

export function GateHeader({ className }: GateHeaderProps) {
  return (
    <header
      className={cn(
        'flex h-14 items-center justify-between border-b border-line bg-surface px-4',
        className,
      )}
    >
      <span className='text-[20px] font-bold text-ink'>guichê</span>
      <div className='flex items-center gap-2'>
        <ShieldCheck className='size-[18px] fill-[#9B2531]' />
        <span className='text-[13px] font-semibold text-[#9B2531]'>
          Portaria
        </span>
      </div>
    </header>
  );
}
