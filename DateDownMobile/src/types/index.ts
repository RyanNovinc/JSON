import { z } from 'zod';

export const countdownSchema = z.object({
  id: z.number(),
  userId: z.string(),
  title: z.string(),
  targetDate: z.string(),
  color: z.string().optional(),
  isFavorite: z.boolean().optional(),
  createdAt: z.string().optional(),
});

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  image: z.string().optional(),
});

export const userSettingsSchema = z.object({
  id: z.number(),
  userId: z.string(),
  isPremium: z.boolean(),
});

export type Countdown = z.infer<typeof countdownSchema>;
export type User = z.infer<typeof userSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;

export type CreateCountdownRequest = Omit<Countdown, 'id' | 'userId' | 'createdAt'>;
export type UpdateCountdownRequest = Partial<CreateCountdownRequest>;