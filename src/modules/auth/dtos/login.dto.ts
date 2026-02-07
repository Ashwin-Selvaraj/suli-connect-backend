import { z } from 'zod';

/** Phone + password login (legacy / admin) */
export const loginSchema = z.object({
  phone: z.string().min(10),
  password: z.string().min(1),
});

export type LoginDto = z.infer<typeof loginSchema>;
