import { formatCurrency } from '@/lib/currency';
import { TruncatedText } from './truncated-text';

interface DescriptionSectionProps {
  description: string | null;
  price?: number;
}

export function DescriptionSection({
  description,
  price,
}: DescriptionSectionProps) {
  return (
    <section className='flex flex-col gap-12 px-5 py-12 md:flex-row md:px-20'>
      <div className='flex-1 md:max-w-[700px]'>
        <h2 className='mb-4 text-[22px] font-semibold text-ink'>
          Descrição do evento
        </h2>
        <TruncatedText
          text={description ?? 'Sem descrição disponível.'}
          maxLines={3}
          className='text-[15px] leading-relaxed text-muted-foreground'
          buttonClassName='text-curtain'
        />
      </div>

      {price !== undefined && (
        <div className='flex flex-col gap-4 md:w-[420px]'>
          <span className='text-sm text-muted-foreground'>A partir de</span>
          <span className='text-[32px] font-bold text-ink'>
            {formatCurrency(price)}
          </span>
        </div>
      )}
    </section>
  );
}
