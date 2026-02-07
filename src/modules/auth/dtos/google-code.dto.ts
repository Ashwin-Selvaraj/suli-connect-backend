import { z } from 'zod';

/** Direct code exchange (mobile / webview) */
export const googleCodeSchema = z.object({
  code: z.string().min(1),
});

export type GoogleCodeDto = z.infer<typeof googleCodeSchema>;
