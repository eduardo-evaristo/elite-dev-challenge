export interface HeroSlide {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  imageUrl?: string | null;
  href?: string;
  variant?: 'movie' | 'event';
}
