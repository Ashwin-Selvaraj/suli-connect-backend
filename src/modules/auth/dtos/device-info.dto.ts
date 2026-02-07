import { z } from 'zod';

/** Device/user agent info for session tracking */
export const deviceInfoSchema = z.object({
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  deviceType: z.string().optional(),
  os: z.string().optional(),
  browser: z.string().optional(),
});

export type DeviceInfo = z.infer<typeof deviceInfoSchema>;
