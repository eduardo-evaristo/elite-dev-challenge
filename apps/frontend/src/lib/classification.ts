import LIcon from '@/assets/L.webp';
import icon6 from '@/assets/6.webp';
import icon10 from '@/assets/10.webp';
import icon12 from '@/assets/12.webp';
import icon14 from '@/assets/14.webp';
import icon16 from '@/assets/16.webp';
import icon18 from '@/assets/18.webp';

export type Classification = 'L' | '6' | '10' | '12' | '14' | '16' | '18';

export const CLASSIFICATION_VALUES: Classification[] = [
  'L',
  '6',
  '10',
  '12',
  '14',
  '16',
  '18',
];

export const CLASSIFICATION_ICONS: Record<Classification, string> = {
  L: LIcon,
  '6': icon6,
  '10': icon10,
  '12': icon12,
  '14': icon14,
  '16': icon16,
  '18': icon18,
};

export const CLASSIFICATION_LABELS: Record<Classification, string> = {
  L: 'Livre',
  '6': '6 anos',
  '10': '10 anos',
  '12': '12 anos',
  '14': '14 anos',
  '16': '16 anos',
  '18': '18 anos',
};

export const CLASSIFICATION_RATINGS: {
  value: Classification;
  label: string;
  icon: string;
}[] = CLASSIFICATION_VALUES.map((value) => ({
  value,
  label: CLASSIFICATION_LABELS[value],
  icon: CLASSIFICATION_ICONS[value],
}));

export function normalizeClassification(
  raw: string | undefined,
): Classification | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace('+', '').trim().toUpperCase();
  return CLASSIFICATION_VALUES.includes(cleaned as Classification)
    ? (cleaned as Classification)
    : undefined;
}
