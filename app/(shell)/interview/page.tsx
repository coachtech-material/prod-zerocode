import TimerexBookingWidget from '@/components/meeting/TimerexBookingWidget';

export const metadata = {
  title: '面談予約',
};

export default function InterviewBookingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-0 lg:py-12">
      <div className="mb-8 space-y-3 text-center">
        <span className="inline-flex items-center justify-center rounded-full bg-brand-blue/10 px-4 py-1 text-sm font-semibold text-white">
          面談サポート
        </span>
        <h1 className="text-3xl font-bold text-white">面談予約</h1>
        <p className="mx-auto max-w-5xl text-sm text-[color:var(--muted)]">
          受講修了時に改めて学習やキャリアに関するご相談を承ります。以下のカレンダーからご都合の良い日時をお選びください。
        </p>
      </div>
      <div className="rounded-3xl border border-brand-blue/20 bg-white p-6 shadow-[0_20px_45px_rgba(30,75,158,0.12)] lg:p-10">
        <div className="mb-6 space-y-2">
          <h2 className="text-xl font-semibold text-brand-blue">ご予約カレンダー</h2>
          <p className="text-sm text-slate-600">
            カレンダーが表示されない場合は、ページを再読み込みするか最新のブラウザでアクセスしてください。
            <br />また、一度予約した面談情報は登録したメールから確認できます。
            <br />ご都合がつかなかった場合などは、<strong>必ずメールにて当該面談を削除してから</strong>再度予約を行なってください。
          </p>
        </div>
        <div className="rounded-2xl border border-brand-blue/10 bg-brand-blue/[0.04] p-4">
          <TimerexBookingWidget />
        </div>
      </div>
    </div>
  );
}
