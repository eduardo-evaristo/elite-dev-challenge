import { useCallback, useEffect, useState } from 'react';

import type { HeroSlide } from '@/features/home/types';
import { cn } from '@/lib/utils';

interface HeroProps {
  slides: HeroSlide[];
}

export function Hero({ slides }: HeroProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;

    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide, slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[currentSlide];

  return (
    <div
      className='relative flex h-[520px] px-20'
      style={{
        background:
          'linear-gradient(135deg, #2E0A10 0%, #9B2531 40%, #4A1E0A 100%)',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className='flex w-[600px] flex-col justify-center gap-4'>
        <h1 className='text-5xl font-bold text-white'>{slide.title}</h1>
        <p className='w-[480px] text-lg text-white'>{slide.description}</p>
        <button
          className={cn(
            'w-fit rounded-md bg-curtain px-6 py-3 text-sm font-semibold text-white',
            'transition-colors hover:bg-curtain-hover',
          )}
        >
          {slide.ctaLabel}
        </button>
      </div>

      <div className='absolute left-[860px] top-[110px] h-[300px] w-[520px] rounded-md bg-white/10' />

      {slides.length > 1 && (
        <div className='absolute bottom-10 left-[692px] flex gap-2'>
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={cn(
                'size-2 rounded-full transition-colors',
                index === currentSlide ? 'bg-white' : 'bg-white/40',
              )}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
