import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GateHeaderProps {
  className?: string;
}

export function GateHeader({ className }: GateHeaderProps) {
  return (
    <header
      className={cn(
        'flex h-16 items-center justify-between bg-surface px-8',
        className,
      )}
    >
      <span className='text-[22px] font-bold text-ink'>guichê</span>
      <div className='flex items-center gap-1.5'>
        <ShieldCheck className='size-[18px] fill-[#9B2531]' />
        <span className='text-[13px] font-semibold text-[#9B2531]'>
          Portaria
        </span>
      </div>
    </header>
  );
}
