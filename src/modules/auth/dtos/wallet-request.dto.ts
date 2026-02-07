import { z } from 'zod';

/** Request nonce for wallet auth */
export const walletRequestSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

export type WalletRequestDto = z.infer<typeof walletRequestSchema>;
