import { z } from 'zod';

const userRoleEnum = z.enum([
  'SUPER_ADMIN', 'ADMIN', 'DOMAIN_HEAD', 'TEAM_LEAD',
  'SENIOR_WORKER', 'WORKER', 'VOLUNTEER', 'VISITOR',
]);

/** Update profile (partial) */
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  role: userRoleEnum.optional(),
  domainId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  reportingManagerId: z.string().optional().nullable(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
