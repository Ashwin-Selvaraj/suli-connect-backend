/** Onboarding payload shape for POST /api/onboarding */
export interface OnboardingPayload {
  fullName: string;
  phone?: string;
  email?: string;
  profilePhoto?: string;

  ageRange?: string;
  gender?: string;
  homeLocation?: {
    city: string;
    state: string;
    country: string;
  };

  engagementTypes: string[];

  availabilityType?: string;
  expectedDuration?: string;

  contributionAreas?: Array<{
    area: string;
    experienceLevel: string;
  }>;
  contributionOther?: string;

  comfortableWithManualWork?: string;
  comfortableWithSharedSpaces?: string;
  healthLimitations?: string;

  stayDetails?: {
    intendedStartDate?: string;
    intendedDuration?: string;
    accommodationPreference?: string;
    foodPreference?: string;
    emergencyContact?: {
      name: string;
      phone: string;
    };
  };

  communityAgreements?: boolean[];
}

export const ENGAGEMENT_OPTIONS = [
  { id: 'volunteer', label: 'Volunteer (short-term)' },
  { id: 'contributor', label: 'Contributor (long-term)' },
  { id: 'live', label: 'Live in the village' },
  { id: 'visitor', label: 'Visitor' },
  { id: 'support', label: 'Support / Donate' },
];

export const AGE_RANGES = ['18–25', '26–35', '36–50', '50+'];
export const AVAILABILITY_TYPES = ['Full-time', 'Part-time', 'Occasional'];
export const EXPECTED_DURATIONS = ['1–7 days', '1–4 weeks', '1–6 months', 'Long-term'];
export const CONTRIBUTION_AREAS = [
  'Agriculture / Farming',
  'Cattle Care',
  'Construction',
  'Water Management',
  'Cooking / Kitchen',
  'Maintenance',
  'Teaching / Knowledge Sharing',
  'Admin / IT / Documentation',
];
export const EXPERIENCE_LEVELS = ['No experience', 'Basic', 'Experienced', 'Expert'];
export const YES_NO_OPTIONS = ['Yes', 'No'];
export const MANUAL_WORK_OPTIONS = ['Yes', 'Limited', 'No'];
export const ACCOMMODATION_OPTIONS = ['Shared', 'Private (if available)'];
export const FOOD_OPTIONS = ['Vegetarian', 'Non-vegetarian', 'Other'];
