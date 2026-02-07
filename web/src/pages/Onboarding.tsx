import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { OnboardingPayload } from '../types/onboarding';
import { STORAGE_KEY } from '../utils/onboarding-storage';
import StepBasicDetails from '../components/onboarding/StepBasicDetails';
import StepAboutYou from '../components/onboarding/StepAboutYou';
import StepEngagement from '../components/onboarding/StepEngagement';
import StepAvailability from '../components/onboarding/StepAvailability';
import StepContribution from '../components/onboarding/StepContribution';
import StepComfort from '../components/onboarding/StepComfort';
import StepStayDetails from '../components/onboarding/StepStayDetails';
import StepCommunityAgreement from '../components/onboarding/StepCommunityAgreement';

const defaultValues: Partial<OnboardingPayload> = {
  fullName: '',
  phone: '',
  email: '',
  profilePhoto: '',
  engagementTypes: [],
  contributionAreas: [],
  communityAgreements: [false, false, false, false],
};

/** Compute visible step indices (conditional steps) */
function getVisibleSteps(values: Partial<OnboardingPayload>): number[] {
  const steps = [1, 2, 3, 4]; // 1: Basic, 2: About, 3: Engagement, 4: Availability
  const hasContribution = ['volunteer', 'contributor', 'live'].some((id) =>
    values.engagementTypes?.includes(id)
  );
  if (hasContribution) steps.push(5); // Contribution
  steps.push(6); // Comfort
  const hasStay = ['live', 'visitor'].some((id) => values.engagementTypes?.includes(id));
  if (hasStay) steps.push(7); // Stay
  steps.push(8); // Community
  return steps;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Partial<OnboardingPayload>>({
    defaultValues,
  });

  const values = form.watch();
  const visibleSteps = getVisibleSteps(values);
  const currentStep = visibleSteps[currentIndex] ?? 1;
  const totalSteps = visibleSteps.length;
  const isLastStep = currentIndex === totalSteps - 1;

  // Persist progress to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ values: form.getValues(), currentIndex }));
    } catch {
      /* ignore */
    }
  }, [values, currentIndex, form]);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { values: saved, currentIndex: savedIndex } = JSON.parse(raw);
        if (saved) form.reset({ ...defaultValues, ...saved });
        if (typeof savedIndex === 'number' && savedIndex >= 0) setCurrentIndex(Math.min(savedIndex, visibleSteps.length - 1));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const goNext = () => {
    if (isLastStep) handleSubmit();
    else setCurrentIndex((i) => Math.min(i + 1, totalSteps - 1));
  };

  const goBack = () => setCurrentIndex((i) => Math.max(0, i - 1));

  const handleSubmit = form.handleSubmit(async (data) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Something went wrong');
      localStorage.removeItem(STORAGE_KEY);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again');
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="onboarding">
      <header className="onboarding-header">
        <h1>SULI Connect</h1>
        <p className="progress">Step {currentIndex + 1} of {totalSteps}</p>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }} />
        </div>
      </header>

      <main className="onboarding-content">
        <form onSubmit={form.handleSubmit(goNext)}>
          {currentStep === 1 && <StepBasicDetails form={form} />}
          {currentStep === 2 && <StepAboutYou form={form} />}
          {currentStep === 3 && <StepEngagement form={form} />}
          {currentStep === 4 && <StepAvailability form={form} />}
          {currentStep === 5 && <StepContribution form={form} />}
          {currentStep === 6 && <StepComfort form={form} />}
          {currentStep === 7 && <StepStayDetails form={form} />}
          {currentStep === 8 && <StepCommunityAgreement form={form} />}

          {error && <p className="error-msg">{error}</p>}

          <div className="onboarding-actions">
            {currentIndex > 0 && (
              <button type="button" onClick={goBack} className="btn btn-secondary">
                Back
              </button>
            )}
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : isLastStep ? 'Finish Onboarding' : 'Continue'}
            </button>
          </div>
        </form>
      </main>

      <style>{`
        .onboarding { max-width: 480px; margin: 0 auto; min-height: 100vh; padding: 24px; background: #fff; }
        .onboarding-header { margin-bottom: 32px; }
        .onboarding-header h1 { font-size: 1.5rem; margin-bottom: 8px; }
        .progress { color: #666; font-size: 0.9rem; }
        .progress-bar { height: 4px; background: #eee; border-radius: 2px; margin-top: 12px; overflow: hidden; }
        .progress-fill { height: 100%; background: #22c55e; transition: width 0.2s; }
        .onboarding-content { margin-bottom: 48px; }
        .onboarding-actions { display: flex; gap: 12px; margin-top: 24px; }
        .onboarding-actions .btn { flex: 1; padding: 14px 20px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .btn-primary { background: #22c55e; color: #fff; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary { background: #e5e7eb; color: #374151; }
        .error-msg { color: #dc2626; margin-top: 12px; }
      `}</style>
    </div>
  );
}
