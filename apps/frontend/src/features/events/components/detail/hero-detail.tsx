import { Calendar, Clock, MapPin } from 'lucide-react';

import {
  CLASSIFICATION_ICONS,
  normalizeClassification,
} from '@/lib/classification';
import { formatDuration, formatEventDate } from '@/lib/datetime';
import { TruncatedText } from './truncated-text';

interface HeroDetailProps {
  variant: 'event' | 'movie';
  imageUrl: string | null;
  title: string;
  date?: string;
  duration?: number;
  location?: string;
  classification?: string;
  description?: string | null;
}

function formatTimeLabel(date: string): string {
  return new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HeroDetail({
  variant,
  imageUrl,
  title,
  date,
  duration,
  location,
  classification,
  description,
}: HeroDetailProps) {
  const normalized = normalizeClassification(classification);

  return (
    <>
      {/* Desktop */}
      <div
        className='relative hidden h-[560px] w-full overflow-hidden md:block'
        style={{
          background:
            'linear-gradient(135deg, #1A0A0F 0%, #3E1E2A 50%, #1A0A0F 100%)',
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className='absolute right-[80px] top-[80px] h-[400px] w-[420px] rounded-md object-cover'
          />
        ) : (
          <div className='absolute right-[80px] top-[80px] h-[400px] w-[420px] rounded-md bg-line' />
        )}

        <div
          className='absolute left-[80px] top-0 flex h-full w-[700px] flex-col gap-8'
          style={{ paddingTop: '155px' }}
        >
          <h1 className='text-[42px] font-bold leading-tight text-white'>
            {title}
          </h1>

          {variant === 'event' && (
            <div className='flex flex-col gap-2'>
              {date && (
                <div className='flex items-center gap-2'>
                  <Calendar
                    className='size-[18px] shrink-0'
                    fill='#FFFFFFAA'
                    color='#FFFFFFAA'
                  />
                  <span className='text-base text-white/80'>
                    {formatEventDate(date)}
                  </span>
                </div>
              )}
              {date && (
                <div className='flex items-center gap-2'>
                  <Clock className='size-[18px] shrink-0' color='#FFFFFFAA' />
                  <span className='text-base text-white/80'>
                    {formatTimeLabel(date)}
                  </span>
                </div>
              )}
              {location && (
                <div className='flex items-center gap-2'>
                  <MapPin className='size-[18px] shrink-0' color='#FFFFFFAA' />
                  <span className='truncate text-base text-white/80'>
                    {location}
                  </span>
                </div>
              )}
            </div>
          )}

          {variant === 'movie' && duration && (
            <div className='flex items-center gap-2'>
              <Clock className='size-[18px] shrink-0' color='#FFFFFFAA' />
              <span className='text-base text-white/80'>
                {formatDuration(duration)}
              </span>
            </div>
          )}

          {normalized && (
            <img
              src={CLASSIFICATION_ICONS[normalized]}
              alt={normalized}
              className='size-9 shrink-0 rounded-[3px]'
            />
          )}

          {variant === 'movie' && description && (
            <TruncatedText
              text={description}
              maxLines={3}
              className='max-w-[600px] text-sm leading-relaxed text-white/70'
              buttonClassName='text-white'
            />
          )}
        </div>
      </div>

      {/* Mobile */}
      <div
        className='relative flex h-auto min-h-[472px] w-full flex-col gap-5 overflow-hidden p-5 md:hidden'
        style={{
          background:
            'linear-gradient(135deg, #1A0A0F 0%, #3E1E2A 50%, #1A0A0F 100%)',
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className='h-[230px] w-[160px] shrink-0 rounded-md object-cover'
          />
        ) : (
          <div className='h-[230px] w-[160px] shrink-0 rounded-md bg-line' />
        )}

        <h1 className='text-[28px] font-bold leading-tight text-white'>
          {title}
        </h1>

        {variant === 'event' && (
          <div className='flex flex-col gap-2'>
            {date && (
              <div className='flex items-center gap-2'>
                <Calendar className='size-4 shrink-0' color='#FFFFFFAA' />
                <span className='text-sm text-white/80'>
                  {formatEventDate(date)}
                </span>
              </div>
            )}
            {date && (
              <div className='flex items-center gap-2'>
                <Clock className='size-4 shrink-0' color='#FFFFFFAA' />
                <span className='text-sm text-white/80'>
                  {formatTimeLabel(date)}
                </span>
              </div>
            )}
            {location && (
              <div className='flex items-center gap-2'>
                <MapPin className='size-4 shrink-0' color='#FFFFFFAA' />
                <span className='text-sm text-white/80'>{location}</span>
              </div>
            )}
          </div>
        )}

        {variant === 'movie' && duration && (
          <div className='flex items-center gap-4'>
            {normalized && (
              <img
                src={CLASSIFICATION_ICONS[normalized]}
                alt={normalized}
                className='size-7 shrink-0 rounded-[3px]'
              />
            )}
            <span className='text-sm text-white/80'>
              {formatDuration(duration)}
            </span>
          </div>
        )}

        {variant === 'event' && normalized && (
          <img
            src={CLASSIFICATION_ICONS[normalized]}
            alt={normalized}
            className='size-7 shrink-0 rounded-[3px]'
          />
        )}

        {variant === 'movie' && description && (
          <TruncatedText
            text={description}
            maxLines={3}
            className='text-[13px] leading-relaxed text-white/70'
            buttonClassName='text-white'
          />
        )}
      </div>
    </>
  );
}
