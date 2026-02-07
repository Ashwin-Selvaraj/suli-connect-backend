import { z } from 'zod';

/** Verify wallet signature and complete auth */
export const walletVerifySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  signature: z.string().min(1, 'Signature required'),
});

export type WalletVerifyDto = z.infer<typeof walletVerifySchema>;
