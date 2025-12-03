import { requireRole } from '@/lib/auth/requireRole';
import TestBasicForm from '@/components/admin/TestBasicForm';
import ToastFromQuery from '@/components/ui/ToastFromQuery';
import TestDetailTabs from '@/components/admin/TestDetailTabs';
import TestSpecEditor from '@/components/admin/TestSpecEditor';
import Link from 'next/link';
import StudentTestPreview from '@/components/admin/TestStudentPreview';
import { loadTestWithMeta, updateTestBasic } from '@/lib/tests/admin';

export const dynamic = 'force-dynamic';

// Actions and data loaders moved to lib/tests/admin for reuse

export default async function TestDetailPage({ params, searchParams }: { params: { testId: string }, searchParams?: Record<string, string> }) {
  await requireRole(['staff','admin'], {
    redirectTo: '/ops-login',
    signOutOnFail: true,
    requireOnboardingComplete: true,
  });
  const { test, courses, chapters } = await loadTestWithMeta(params.testId);
  if (!test) return (<div className="text-sm text-slate-600">テストが見つかりません。</div>);
  const canDetails = !!test.mode;
  const initialTab = ((searchParams?.tab as string) || (canDetails ? 'details' : 'basic')) as 'basic' | 'details' | 'preview';

  return (
    <div className="space-y-6">
      <ToastFromQuery />
      {/* Breadcrumbs */}
      <nav aria-label="breadcrumbs" className="text-sm text-slate-500">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/admin" className="underline decoration-white/20 hover:decoration-white focus-ring rounded">
              Admin
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link href="/admin/test/comfirm" className="underline decoration-white/20 hover:decoration-white focus-ring rounded">
              確認テスト管理
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li aria-current="page" className="text-slate-700 truncate max-w-[60ch]">
            {test?.title || 'テスト編集'}
          </li>
        </ol>
      </nav>
      <h1 className="text-xl font-semibold">確認テスト編集</h1>
      <TestDetailTabs
        initialTab={initialTab}
        canDetails={canDetails}
        basic={(<section className="rounded-2xl border border-brand-sky/20 bg-white p-4"><TestBasicForm action={updateTestBasic} test={test} courses={courses} chapters={chapters} /></section>)}
        details={<TestSpecEditor testId={test.id} mode={test.mode} initialSpec={test.spec_yaml} />}
        preview={<section className="rounded-2xl border border-brand-sky/20 bg-white p-2"><StudentTestPreview mode={test.mode} initialSpec={test.spec_yaml} /></section>}
      />
    </div>
  );
}
