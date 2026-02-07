import { z } from 'zod';

/** OAuth callback query params (code, state from provider) */
export const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
});

export type OAuthCallbackQuery = z.infer<typeof oauthCallbackQuerySchema>;
