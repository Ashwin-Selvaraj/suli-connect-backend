import { z } from 'zod';

/** Verify OTP and complete auth */
export const phoneOtpVerifySchema = z.object({
  phone: z.string().min(10).max(20),
  otp: z.string().length(6).regex(/^\d+$/),
});

export type PhoneOtpVerifyDto = z.infer<typeof phoneOtpVerifySchema>;
