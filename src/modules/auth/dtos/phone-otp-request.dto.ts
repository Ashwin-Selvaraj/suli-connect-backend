import { z } from 'zod';

/** Request OTP for phone number */
export const phoneOtpRequestSchema = z.object({
  phone: z.string().min(10).max(20),
});

export type PhoneOtpRequestDto = z.infer<typeof phoneOtpRequestSchema>;
