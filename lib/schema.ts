import { z } from 'zod';

export const tokenSchema = z.object({
  name: z.string().min(1, 'Token name is required').max(32, 'Max 32 chars'),
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .max(10, 'Max 10 characters')
    .regex(/^[A-Za-z0-9]+$/, 'Letters and numbers only'),
  decimals: z.coerce.number().int().min(0).max(9),
  supply: z
    .string()
    .min(1, 'Supply is required')
    .regex(/^[\d,]+$/, 'Numbers only'),
  description: z.string().max(500, 'Max 500 chars').optional().or(z.literal('')),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  twitter: z.string().optional().or(z.literal('')),
  telegram: z.string().optional().or(z.literal('')),
});

export type TokenFormValues = z.infer<typeof tokenSchema>;
