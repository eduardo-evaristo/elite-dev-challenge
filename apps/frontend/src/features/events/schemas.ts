import { z } from 'zod';

export const TOTAL_STEPS = 5;

export const eventCreateSearchSchema = z.object({
  step: z.number().min(1).max(TOTAL_STEPS).default(1).catch(1),
  type: z.enum(['movie', 'show']).optional(),
});

export type EventCreateSearch = z.infer<typeof eventCreateSearchSchema>;

export const step1Schema = z.object({
  type: z.enum(['movie', 'show']),
});

export type Step1Data = z.infer<typeof step1Schema>;
