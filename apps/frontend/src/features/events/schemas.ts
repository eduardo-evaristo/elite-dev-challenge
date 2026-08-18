import { z } from 'zod';

export const TOTAL_STEPS = 5;

export const eventCreateSearchSchema = z.object({
  step: z.number().min(1).max(TOTAL_STEPS).default(1).catch(1),
  type: z.enum(['movie', 'show']).optional(),
  query: z.string().optional(),
  externalId: z.string().optional(),
  format: z.enum(['seated', 'standing']).optional(),
  rows: z.number().min(1).max(50).optional(),
  seatsPerRow: z.number().min(1).max(30).optional(),
  sectors: z.string().optional(),
});

export type EventCreateSearch = z.infer<typeof eventCreateSearchSchema>;

export const step1Schema = z.object({
  type: z.enum(['movie', 'show']),
});

export type Step1Data = z.infer<typeof step1Schema>;
