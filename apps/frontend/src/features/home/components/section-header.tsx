import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  onPrev: () => void;
  onNext: () => void;
}

export function SectionHeader({ title, onPrev, onNext }: SectionHeaderProps) {
  return (
    <div className='flex items-center justify-between'>
      <h2 className='text-xl font-semibold text-ink md:text-2xl'>{title}</h2>
      <div className='flex items-center gap-2'>
        <button
          onClick={onPrev}
          className='text-muted-foreground transition-colors hover:text-ink'
          aria-label='Anterior'
        >
          <ChevronLeft className='size-6' />
        </button>
        <button
          onClick={onNext}
          className='text-muted-foreground transition-colors hover:text-ink'
          aria-label='Próximo'
        >
          <ChevronRight className='size-6' />
        </button>
      </div>
    </div>
  );
}
