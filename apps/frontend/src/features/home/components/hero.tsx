import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

import type { HeroSlide } from '@/features/home/types';
import { cn } from '@/lib/utils';

interface HeroProps {
  slides: HeroSlide[];
}

export function Hero({ slides }: HeroProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();

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

  const handleSlideClick = () => {
    if (slide.href) {
      navigate({ to: slide.href });
    }
  };

  return (
    <div
      className='relative flex h-[400px] px-6 md:h-[520px] md:px-20'
      style={{
        background:
          'linear-gradient(135deg, #2E0A10 0%, #9B2531 40%, #4A1E0A 100%)',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className='flex w-full flex-col justify-center gap-3 md:w-[600px] md:gap-4'>
        <h1 className='text-3xl font-bold text-white md:text-5xl'>
          {slide.title}
        </h1>
        <p className='w-full text-base text-white md:w-[480px] md:text-lg line-clamp-3'>
          {slide.description}
        </p>
        <button
          onClick={handleSlideClick}
          className={cn(
            'w-fit rounded-md bg-curtain px-5 py-2.5 text-sm font-semibold text-white md:px-6 md:py-3',
            'transition-colors hover:bg-curtain-hover',
          )}
        >
          {slide.ctaLabel}
        </button>
      </div>

      {slide.imageUrl ? (
        <img
          src={slide.imageUrl}
          alt={slide.title}
          className='absolute right-20 top-[60px] hidden h-[400px] w-[300px] rounded-md object-cover md:block'
        />
      ) : (
        <div className='absolute right-20 top-[110px] hidden h-[300px] w-[520px] rounded-md bg-white/10 md:block' />
      )}

      {slides.length > 1 && (
        <div className='absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2 md:bottom-10 md:left-[692px] md:translate-x-0'>
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
