import type { ReactNode } from 'react';
import { Stepper, StepperMobile, REGISTER_STEPS } from '@/components/register/Stepper';
import { readOnboardingState } from '@/lib/onboarding/state';

export default function RegisterLayout({ children }: { children: ReactNode }) {
  const state = readOnboardingState();
  const totalSteps = REGISTER_STEPS.length;
  const step = Math.min(Math.max(state.step ?? 1, 1), totalSteps + 1);
  return (
    <div className="flex min-h-screen w-full flex-col bg-[color:var(--color-surface-strong)] lg:flex-row">
      <aside className="hidden min-h-screen flex-none lg:flex lg:w-[35%]">
        <Stepper step={step} />
      </aside>
      <main className="flex w-full flex-1 flex-col bg-transparent px-4 pb-12 pt-8 sm:px-10 lg:px-16 lg:py-16 lg:justify-center">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col lg:justify-center">
          <StepperMobile step={step} />
          <div className="flex-1 lg:flex lg:items-center lg:justify-center">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
