import { useEffect } from 'react';
import type { CatalogItemDetail } from '@elite-dev/shared';

import LIcon from '@/assets/L.webp';
import icon6 from '@/assets/6.webp';
import icon10 from '@/assets/10.webp';
import icon12 from '@/assets/12.webp';
import icon14 from '@/assets/14.webp';
import icon16 from '@/assets/16.webp';
import icon18 from '@/assets/18.webp';

import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/datetime';

type Classification = 'L' | '6' | '10' | '12' | '14' | '16' | '18';

interface StepDetailsProps {
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
  onFieldChange: (
    field:
      | 'name'
      | 'date'
      | 'time'
      | 'duration'
      | 'location'
      | 'ticketPrice'
      | 'description'
      | 'classification',
    value: string | number | undefined,
  ) => void;
}

const RATINGS: { value: Classification; label: string; icon: string }[] = [
  { value: 'L', label: 'Livre', icon: LIcon },
  { value: '6', label: '6 anos', icon: icon6 },
  { value: '10', label: '10 anos', icon: icon10 },
  { value: '12', label: '12 anos', icon: icon12 },
  { value: '14', label: '14 anos', icon: icon14 },
  { value: '16', label: '16 anos', icon: icon16 },
  { value: '18', label: '18 anos', icon: icon18 },
];

const VALID_CLASSIFICATIONS = ['L', '6', '10', '12', '14', '16', '18'];

function normalizeClassification(
  raw: string | undefined,
): Classification | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace('+', '').trim().toUpperCase();
  return VALID_CLASSIFICATIONS.includes(cleaned)
    ? (cleaned as Classification)
    : undefined;
}

const inputClass =
  'w-full rounded-md border border-line bg-surface px-3.5 py-3 text-sm text-ink outline-none focus:border-curtain';

export function StepDetails({
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
  onFieldChange,
}: StepDetailsProps) {
  const isMovie = type === 'movie';
  const isSeated = format === 'seated';

  useEffect(() => {
    if (isMovie && detail) {
      if (detail.overview && !description) {
        onFieldChange('description', detail.overview);
      }
      if (detail.runtime && !duration) {
        onFieldChange('duration', detail.runtime);
      }
      if (!classification) {
        const normalized = normalizeClassification(detail.certification);
        if (normalized) {
          onFieldChange('classification', normalized);
        }
      }
    }
  }, [isMovie, detail, description, duration, classification, onFieldChange]);

  const handleDurationChange = (value: string) => {
    const num = value ? parseInt(value, 10) : undefined;
    onFieldChange('duration', num);
  };

  return (
    <>
      <h2 className='text-[22px] font-semibold text-ink'>Detalhes do evento</h2>
      <p className='text-sm text-muted-foreground'>
        Quando e onde vai acontecer.
      </p>
      <div className='flex flex-col gap-5'>
        {!isMovie && (
          <label className='flex flex-col gap-2'>
            <span className='text-[13px] font-semibold text-ink'>
              Nome do evento
            </span>
            <input
              type='text'
              value={name ?? ''}
              onChange={(e) => onFieldChange('name', e.target.value)}
              placeholder='Nome do evento'
              className={inputClass}
            />
          </label>
        )}

        <div className='flex flex-col gap-3 md:flex-row md:gap-5'>
          <label className='flex flex-1 flex-col gap-2'>
            <span className='text-[13px] font-semibold text-ink'>Data</span>
            <input
              type='date'
              value={date ?? ''}
              onChange={(e) => onFieldChange('date', e.target.value)}
              className={inputClass}
            />
          </label>
          <label className='flex flex-1 flex-col gap-2'>
            <span className='text-[13px] font-semibold text-ink'>Horário</span>
            <input
              type='time'
              value={time ?? ''}
              onChange={(e) => onFieldChange('time', e.target.value)}
              className={inputClass}
            />
          </label>
          <label className='flex flex-1 flex-col gap-2'>
            <span className='text-[13px] font-semibold text-ink'>Duração</span>
            <input
              type='number'
              min={1}
              value={duration ?? ''}
              onChange={(e) => handleDurationChange(e.target.value)}
              placeholder='min'
              className={inputClass}
            />
            {duration && duration > 0 && (
              <span className='text-xs text-muted-foreground'>
                {formatDuration(duration)}
              </span>
            )}
          </label>
        </div>

        <label className='flex flex-col gap-2'>
          <span className='text-[13px] font-semibold text-ink'>Local</span>
          <input
            type='text'
            value={location ?? ''}
            onChange={(e) => onFieldChange('location', e.target.value)}
            placeholder='Local do evento'
            className={inputClass}
          />
        </label>

        {isSeated && (
          <label className='flex flex-col gap-2'>
            <span className='text-[13px] font-semibold text-ink'>
              Preço do ingresso
            </span>
            <input
              type='text'
              inputMode='decimal'
              value={ticketPrice ?? ''}
              onChange={(e) => onFieldChange('ticketPrice', e.target.value)}
              placeholder='R$ 0,00'
              className={inputClass}
            />
          </label>
        )}

        <label className='flex flex-col gap-2'>
          <span className='text-[13px] font-semibold text-ink'>
            Descrição (opcional)
          </span>
          <textarea
            value={description ?? ''}
            onChange={(e) => onFieldChange('description', e.target.value)}
            placeholder='Descrição do evento'
            rows={4}
            className={cn(inputClass, 'resize-none py-3 leading-relaxed')}
          />
        </label>

        <div className='flex flex-col gap-2'>
          <span className='text-[13px] font-semibold text-ink'>
            Classificação
          </span>
          <div className='flex flex-wrap gap-3'>
            {RATINGS.map((rating) => {
              const isSelected = classification === rating.value;
              return (
                <button
                  key={rating.value}
                  type='button'
                  onClick={() => onFieldChange('classification', rating.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-md bg-surface px-3.5 py-2.5 transition-colors',
                    isSelected
                      ? 'border-2 border-curtain'
                      : 'border border-line hover:border-line-strong',
                  )}
                >
                  <img
                    src={rating.icon}
                    alt={rating.label}
                    className='size-7'
                  />
                  <span
                    className={cn(
                      'text-[13px]',
                      isSelected
                        ? 'font-semibold text-ink'
                        : 'text-muted-foreground',
                    )}
                  >
                    {rating.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
