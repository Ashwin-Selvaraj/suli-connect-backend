import { z } from 'zod';

const userRoleEnum = z.enum([
  'SUPER_ADMIN', 'ADMIN', 'DOMAIN_HEAD', 'TEAM_LEAD',
  'SENIOR_WORKER', 'WORKER', 'VOLUNTEER', 'VISITOR',
]);

/** Profile setup after signup (e.g. OAuth or Wallet) */
export const profileSetupSchema = z.object({
  name: z.string().min(1).max(100),
  role: userRoleEnum.optional().default('WORKER'),
  domainId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  reportingManagerId: z.string().optional().nullable(),
});

export type ProfileSetupDto = z.infer<typeof profileSetupSchema>;
