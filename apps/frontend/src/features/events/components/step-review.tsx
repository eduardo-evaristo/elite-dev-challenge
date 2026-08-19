import type { CatalogItemDetail } from '@elite-dev/shared';

import {
  CLASSIFICATION_ICONS,
  CLASSIFICATION_LABELS,
  type Classification,
} from '@/lib/classification';
import { formatDateForDisplay, formatDuration } from '@/lib/datetime';

interface StepReviewProps {
  type: 'movie' | 'show';
  format: 'seated' | 'standing' | undefined;
  detail: CatalogItemDetail | undefined;
  name: string | undefined;
  date: string | undefined;
  time: string | undefined;
  duration: number | undefined;
  location: string | undefined;
  ticketPrice: string | undefined;
  description: string | undefined;
  classification: Classification | undefined;
  rows: number | undefined;
  seatsPerRow: number | undefined;
  sectors: string | undefined;
}

function parseSectorsCount(sectors: string | undefined): number {
  if (!sectors) return 0;
  try {
    const parsed = JSON.parse(sectors);
    if (Array.isArray(parsed)) return parsed.length;
  } catch {
    // ignore
  }
  return 0;
}

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className='flex gap-6 border-t border-line px-7 py-4'>
      <span className='w-48 shrink-0 text-[13px] text-muted-foreground'>
        {label}
      </span>
      <span className='flex-1 text-sm font-medium text-ink'>{value}</span>
    </div>
  );
}

export function StepReview({
  type,
  format,
  detail,
  name,
  date,
  time,
  duration,
  location,
  ticketPrice,
  description,
  classification,
  rows,
  seatsPerRow,
  sectors,
}: StepReviewProps) {
  const isMovie = type === 'movie';
  const isSeated = format === 'seated';
  const title = isMovie ? detail?.title : name;
  const subtitle = `${isMovie ? 'Filme' : 'Show'} · ${isSeated ? 'Assento nomeado' : 'Setores'}`;

  return (
    <>
      <h2 className='text-[22px] font-semibold text-ink'>
        Revisão e publicação
      </h2>
      <p className='text-sm text-muted-foreground'>
        Confira tudo antes de publicar. Você ainda pode voltar para ajustar.
      </p>
      <div className='rounded-md border border-line bg-surface'>
        <div className='flex items-center gap-5 px-7 py-6'>
          {detail?.posterUrl ? (
            <img
              src={detail.posterUrl}
              alt={title}
              className='h-28 w-20 rounded border border-line object-cover'
            />
          ) : (
            <div className='h-28 w-20 rounded border border-line bg-paper' />
          )}
          <div className='flex flex-col gap-2'>
            <span className='text-xl font-semibold text-ink'>
              {title ?? '—'}
            </span>
            <span className='text-[13px] text-muted-foreground'>
              {subtitle}
            </span>
          </div>
        </div>
        <ReviewRow
          label='Data e horário'
          value={date ? formatDateForDisplay(date, time) : '—'}
        />
        <ReviewRow label='Local' value={location ?? '—'} />
        {isSeated && (
          <ReviewRow label='Preço do ingresso' value={ticketPrice ?? '—'} />
        )}
        <ReviewRow
          label='Formato de venda'
          value={
            isSeated
              ? `Assento nomeado · ${rows ?? 0} fileiras × ${seatsPerRow ?? 0} assentos`
              : `Setores · ${parseSectorsCount(sectors)} setores`
          }
        />
        {duration && duration > 0 && (
          <ReviewRow label='Duração' value={formatDuration(duration)} />
        )}
        {classification && (
          <ReviewRow
            label='Classificação'
            value={
              <span className='flex items-center gap-2'>
                <img
                  src={CLASSIFICATION_ICONS[classification]}
                  alt={CLASSIFICATION_LABELS[classification]}
                  className='size-7'
                />
                <span>{CLASSIFICATION_LABELS[classification]}</span>
              </span>
            }
          />
        )}
        {description && <ReviewRow label='Descrição' value={description} />}
      </div>
    </>
  );
}
