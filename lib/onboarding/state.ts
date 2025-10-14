import { cookies } from 'next/headers';

const COOKIE_NAME = 'onboarding_state';

export type OnboardingState = {
  step: number;
  email?: string;
  lastEmailSentAt?: string;
  verifiedAt?: string;
};

const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function readOnboardingState(): OnboardingState {
  const store = cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return { step: 1 };
  try {
    const parsed = JSON.parse(raw) as OnboardingState;
    if (!parsed || typeof parsed !== 'object') return { step: 1 };
    return { step: typeof parsed.step === 'number' ? parsed.step : 1, email: parsed.email, lastEmailSentAt: parsed.lastEmailSentAt, verifiedAt: parsed.verifiedAt };
  } catch {
    return { step: 1 };
  }
}

export function writeOnboardingState(next: OnboardingState) {
  const store = cookies();
  const payload = JSON.stringify(next);
  store.set({ name: COOKIE_NAME, value: payload, httpOnly: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE });
}

export function updateOnboardingState(patch: Partial<OnboardingState>) {
  const current = readOnboardingState();
  const desiredStep = patch.step ?? current.step ?? 1;
  const next: OnboardingState = {
    ...current,
    ...patch,
    step: Math.max(desiredStep, 1),
  };
  writeOnboardingState(next);
  return next;
}

export function clearOnboardingState() {
  const store = cookies();
  store.delete(COOKIE_NAME);
}
