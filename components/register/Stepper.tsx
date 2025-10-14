import Image from 'next/image';
import { Check } from 'lucide-react';

export const REGISTER_STEPS = [
  { id: 1, label: 'メールアドレスを登録' },
  { id: 2, label: 'メールの承認' },
  { id: 3, label: 'パスワード設定' },
  { id: 4, label: 'プロフィール設定' },
  { id: 5, label: '完了' },
] as const;

export function Stepper({ step }: { step: number }) {
  const totalSteps = REGISTER_STEPS.length;
  const completedThreshold = Math.min(step, totalSteps);
  const isDone = step > totalSteps;
  return (
    <div className="flex h-full w-full min-w-[300px] flex-col bg-brand-blue text-white">
      <div className="flex flex-1 flex-col items-center justify-center px-10 py-12">
        <div className="w-full max-w-[360px] space-y-10">
          <h1 className="text-2xl font-semibold text-center text-white">会員登録の流れ</h1>
          <ol className="flex w-full flex-col items-start space-y-6">
            {REGISTER_STEPS.map((item) => {
              const isCompleted =
                item.id < completedThreshold ||
                (item.id === completedThreshold &&
                  (item.id === totalSteps ? isDone : step > item.id));
              const isCurrent = item.id === completedThreshold && !isCompleted;
              return (
                <li key={item.id} className="flex w-full items-center justify-start gap-4">
                  <div className="flex items-center gap-4">
                    <span
                      className={[
                        'flex h-11 w-11 items-center justify-center rounded-full border text-base transition',
                        isCompleted
                          ? 'border-[#FFFF55] bg-[#FFFF55] text-brand'
                          : isCurrent
                            ? 'border-white text-white'
                            : 'border-white/40 text-white/60',
                      ].join(' ')}
                      aria-hidden
                    >
                      {isCompleted ? <Check className="h-5 w-5 stroke-[3]" /> : item.id}
                    </span>
                    <span
                      className={[
                        'text-xl font-semibold tracking-wide text-left',
                        isCompleted
                          ? 'text-white'
                          : isCurrent
                            ? 'text-white'
                            : 'text-white/70',
                      ].join(' ')}
                    >
                      {item.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="mt-0 flex w-full justify-center">
          <Image src="/onboarding1.jpg" alt="onboarding" width={228} height={156} priority sizes="228px" />
        </div>
      </div>
    </div>
  );
}

export function StepperMobile({ step }: { step: number }) {
  const totalSteps = REGISTER_STEPS.length;
  const completedThreshold = Math.min(step, totalSteps);
  const isDone = step > totalSteps;
  return (
    <div className="mb-8 flex items-center justify-between gap-3 rounded-2xl border border-brand/40 bg-brand px-4 py-3 text-white shadow-sm lg:hidden">
      {REGISTER_STEPS.map((item, idx) => {
        const isCompleted =
          item.id < completedThreshold ||
          (item.id === completedThreshold &&
            (item.id === totalSteps ? isDone : step > item.id));
        const isCurrent = item.id === completedThreshold && !isCompleted;
        return (
          <div key={item.id} className="flex flex-1 flex-col items-center gap-1 text-center">
            <span
              className={[
                'flex h-8 w-8 items-center justify-start rounded-full border text-xs font-semibold transition',
                isCompleted
                  ? 'border-[#FFFF55] bg-[#FFFF55] text-brand'
                  : isCurrent
                    ? 'border-white text-white'
                    : 'border-white/50 text-white/60',
              ].join(' ')}
            >
              {isCompleted ? <Check className="h-5 w-5 stroke-[3]" /> : item.id}
            </span>
            <span className="text-sm leading-tight text-white/90">{item.label}</span>
            {idx < REGISTER_STEPS.length - 1 && <span className="hidden" aria-hidden>→</span>}
          </div>
        );
      })}
    </div>
  );
}
