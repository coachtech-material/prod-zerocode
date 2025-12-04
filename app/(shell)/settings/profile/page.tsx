import { requireRole } from '@/lib/auth/requireRole';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase/service';
import ToastFromQuery from '@/components/ui/ToastFromQuery';
import AvatarPicker from '@/components/settings/AvatarPicker';

export const dynamic = 'force-dynamic';

async function getAccount() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const provider = user.app_metadata?.provider || 'email';
  const email = user.email || '';
  const id = user.id;
  return { id, email, provider };
}

function normalizePhone(input: string): string {
  const s = (input || '').trim();
  // Digits only
  return s.replace(/\D+/g, '');
}

export default async function SettingsProfilePage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const { profile } = await requireRole(['user', 'staff', 'admin']);
  const account = await getAccount();
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('profiles')
    .select('first_name,last_name,phone,avatar_url,role')
    .eq('id', profile.id)
    .single();
  const p = (data || {}) as any;

  const saveAction = saveProfile.bind(null, profile.id, p.role || profile.role);

  return (
    <div className="space-y-6">
      <ToastFromQuery />
      <h1 className="text-xl font-semibold">プロフィール情報</h1>

      {/* Account section */}
      <section className="rounded-2xl border border-brand-sky/20 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-600">アカウント情報</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs text-slate-500">メールアドレス</div>
            <div className="text-sm">{account?.email || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">ロール</div>
            <div className="text-sm">{p.role || profile.role}</div>
          </div>
        </div>
      </section>

      {/* Editable profile */}
      <section className="rounded-2xl border border-brand-sky/20 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-600">プロフィール</h2>
        <form action={saveAction} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs text-slate-500">姓（必須）</span>
              <input name="last_name" defaultValue={p.last_name || ''} required minLength={1} maxLength={50} className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-slate-500">名（必須）</span>
              <input name="first_name" defaultValue={p.first_name || ''} required minLength={1} maxLength={50} className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring" />
            </label>
            <label className="grid gap-1 sm:col-span-2">
              <span className="text-xs text-slate-500">電話番号{(p.role || profile.role) === 'user' ? '（必須）' : '（任意）'}</span>
              <input
                name="phone"
                defaultValue={p.phone || ''}
                className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring"
                placeholder="例: 09012345678"
                inputMode="numeric"
                pattern="[0-9]*"
              />
              <span className="text-xs text-slate-500">半角数字のみ</span>
            </label>
          </div>

          <div className="grid gap-2">
            <span className="text-xs text-slate-500">アバター画像</span>
            <AvatarPicker name="avatar" defaultUrl={p.avatar_url || null} />
          </div>

          {/* Unfilled badges */}
          <div className="text-xs text-slate-500">
            {(!p.first_name || !p.last_name) && <span className="mr-2 rounded-full bg-brand-sky/10 px-2 py-0.5">未入力: 氏名</span>}
            {((p.role || profile.role) === 'user' && !p.phone) && <span className="mr-2 rounded-full bg-brand-sky/10 px-2 py-0.5">未入力: 電話番号</span>}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button type="submit" className="rounded-xl bg-brand-yellow px-4 py-2 text-brand focus-ring">保存</button>
            <a href="/settings/profile" className="rounded-xl bg-brand-sky/10 px-4 py-2 focus-ring">キャンセル</a>
          </div>
        </form>
      </section>

      {/* 危険領域は非表示（要件により削除） */}
    </div>
  );
}

export const runtime = 'nodejs';

// Server Actions
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

async function saveProfile(userId: string, role: string, formData: FormData) {
  "use server";
  const adminClient = createServerSupabaseAdminClient();
  const first_name = String(formData.get('first_name') || '').trim();
  const last_name = String(formData.get('last_name') || '').trim();
  const rawPhone = String(formData.get('phone') || '').trim();
  const phone = normalizePhone(rawPhone);
  const file = formData.get('avatar') as File | null;

  // Validation
  const bad = (s: string, min=0, max=50) => s.length < min || s.length > max;
  if (bad(first_name, 1) || bad(last_name, 1)) {
    redirect('/settings/profile?error=' + encodeURIComponent('氏名の文字数が不正です'));
  }
  if (role === 'user' && !phone) {
    redirect('/settings/profile?error=' + encodeURIComponent('学習者は電話番号が必須です'));
  }
  if (phone && /\D/.test(phone)) {
    redirect('/settings/profile?error=' + encodeURIComponent('電話番号に許容されない文字が含まれています'));
  }

  // Handle avatar upload if provided
  let avatar_url: string | undefined = undefined;
  if (file && typeof file.arrayBuffer === 'function' && file.size > 0) {
    const MAX = 2 * 1024 * 1024;
    const okType = ['image/png','image/jpeg','image/webp'];
    if (!okType.includes(file.type)) {
      redirect('/settings/profile?error=' + encodeURIComponent('アバターは png/jpg/jpeg/webp のみ'));
    }
    if (file.size > MAX) {
      redirect('/settings/profile?error=' + encodeURIComponent('アバターは 2MB 以下にしてください'));
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = file.type.split('/')[1] || 'png';
    const path = `avatars/${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await adminClient.storage.from('avatars').upload(path, buf, { contentType: file.type, cacheControl: '3600', upsert: false });
    if (error) {
      redirect('/settings/profile?error=' + encodeURIComponent('画像の保存に失敗しました: ' + error.message));
    }
    const { data: pub } = adminClient.storage.from('avatars').getPublicUrl(path);
    avatar_url = pub.publicUrl;
  }

  const update: any = { first_name, last_name, phone };
  if (avatar_url) update.avatar_url = avatar_url;

  const { error: upErr } = await adminClient
    .from('profiles')
    .update(update)
    .eq('id', userId);
  if (upErr) {
    redirect('/settings/profile?error=' + encodeURIComponent(upErr.message));
  }
  revalidatePath('/settings/profile');
  redirect('/settings/profile?message=' + encodeURIComponent('保存しました'));
}
