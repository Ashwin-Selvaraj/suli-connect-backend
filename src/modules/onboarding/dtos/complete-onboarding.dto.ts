import { z } from 'zod';

/**
 * Full onboarding payload schema - matches frontend OnboardingFormValues.
 * Steps 1–8; conditional steps handled by frontend.
 */
const engagementEnum = z.enum([
  'Volunteer',
  'Contributor',
  'Live in village',
  'Visitor',
  'Support/Donate',
]);

export const onboardingPayloadSchema = z.object({
  // Step 1: Basic details
  fullName: z.string().min(1, 'Full name is required').max(100),
  phone: z.string().optional(),
  email: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.string().email().optional().nullable()
  ),
  profileImageUrl: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.string().url().optional().nullable()
  ),

  // Step 2: About you
  ageRange: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),

  // Step 3: Engage
  engagement: z.array(engagementEnum).min(1, 'Select at least one engagement type'),

  // Step 4: Availability
  availabilityType: z.enum(['Full-time', 'Part-time', 'Occasional']).optional().nullable(),
  duration: z.string().optional().nullable(),

  // Step 5: Contribution (conditional)
  contributionAreas: z.array(z.string()).optional(),
  contributionExperience: z.record(z.string()).optional(),
  contributionOther: z.string().optional().nullable(),

  // Step 6: Comfort
  manualWork: z.enum(['Yes', 'Limited', 'No']).optional().nullable(),
  sharedSpaces: z.enum(['Yes', 'No']).optional().nullable(),
  healthLimitations: z.string().optional().nullable(),

  // Step 7: Stay (conditional)
  startDate: z.string().optional().nullable(),
  accommodation: z.string().optional().nullable(),
  food: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),

  // Username - optional; generated from fullName if missing
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .optional()
    .nullable(),
});

export type OnboardingPayload = z.infer<typeof onboardingPayloadSchema>;
