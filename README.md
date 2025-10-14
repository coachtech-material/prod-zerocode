# Minimal Next.js + Supabase Auth Scaffold

箱だけの Next.js(App Router, TypeScript) + Supabase(Postgres, Auth) スターターです。認証と最小ロール管理のみを実装し、業務機能は含みません。

## 構成
- フロント: Next.js 14+ (App Router, TypeScript)
- バックエンド: Supabase (Postgres, Auth)
- ライブラリ: `@supabase/supabase-js` v2, `@supabase/ssr`
- UI: 素のHTML/CSS（最小）

## 0. 概要（拡張）
目的: staff が教材（Course／Lesson）を作成・公開し、user が受講画面で閲覧できる土台を用意します。テストや採点、通知などは対象外です。

### スキーマ追加とRLS
- 追加テーブル: `courses`, `lessons`, `enrollments`, `progress`
- RLS 方針:
  - 既定 Deny All
  - staff/admin は courses/lessons の全件 SELECT、INSERT/UPDATE 可、DELETE は admin のみ
  - user は `status='published'` かつ自分が `enrollments.active` のコースのみ SELECT
  - lessons は上記に加え `progress.is_unlocked=true` のレッスンのみ SELECT
  - enrollments/progress は本人は自分の行のみ、staff/admin は全行（MVP簡易）

### ストレージ
- バケット: `lesson-assets`, `thumbnails`（public）
- 書き込み: staff/admin のみ、読み取り: 公開URL（select policyでpublic許可）

### 画面（プレースホルダ）
- `/admin/courses`, `/admin/lessons`: 管理UIのプレースホルダ
- `/courses/[courseId]`, `/lessons/[lessonId]`: 受講UIのプレースホルダ
- サイドバーはロールでメニュー差し替え（user=学習, staff/admin=管理）

## ディレクトリ
- `app/`
  - `page.tsx` ルート: 未ログインは `/login`、ログイン済みは `/dashboard` へリダイレクト
  - `login/page.tsx` ログイン＆（ALLOW_SIGNUP=true のときのみ）サインアップ
  - `dashboard/page.tsx` サインアウトボタンと user_id / role 表示
  - `admin/page.tsx` staff/admin のみアクセス可
- `lib/supabase/`
  - `client.ts` ブラウザ用クライアント
  - `server.ts` RSC/Route 用クライアント
- `lib/auth/`
  - `requireRole.ts` サーバ側での認可ヘルパ
  - `actions.ts` サインイン/サインアップ/サインアウトの Server Action
- `supabase/migrations/0001_init_profiles.sql` スキーマとRLS
- `scripts/make-admin.sql` 任意ユーザーを admin に昇格
- `.env.example` 必要な環境変数の例

## セットアップ
1) Supabase プロジェクトを作成
   - https://supabase.com/ にて新規プロジェクトを作成
   - プロジェクトの Settings → API から `Project URL` と `anon public` キーを取得

2) 環境変数を設定
   - `.env` を作成し、以下を設定
     ```env
     NEXT_PUBLIC_SUPABASE_URL=<your project url>
     NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
     ALLOW_SIGNUP=true
     ```
   - 本番でサインアップを無効化する場合は `ALLOW_SIGNUP=false` にします。

3) マイグレーションの適用
   - Supabase の SQL エディタで以下を順に実行
     1. `supabase/migrations/0001_init_profiles.sql`
     2. `supabase/migrations/0002_profiles_insert_policy.sql`
     3. `supabase/migrations/0003_courses_lessons_enrollments_progress.sql`
     4. `supabase/migrations/0004_storage_buckets_policies.sql`
     5. `supabase/migrations/0005_courses_lessons_add_columns.sql`
   - もしくは Supabase CLI で適用してもOKです

4) トラブルシュート（RESTのスキーマキャッシュ）
   - `Could not find the table 'public.<table>' in the schema cache` と出る場合、PostgREST のスキーマキャッシュ未更新が原因です。
   - 対処: Supabase SQL エディタで以下を実行（`scripts/reload-postgrest-schema.sql` にも保存済み）
     ```sql
     select pg_notify('pgrst', 'reload schema');
     select pg_notify('pgrst', 'reload config');
     ```
     もしくは Dashboard > Settings > API から「Restart API」を実行します。

4) ローカル起動
   - 依存関係をインストール: `npm i`
   - 開発サーバ起動: `npm run dev`

## Vercel デプロイ
1. リポジトリを GitHub 等に公開し、Vercel ダッシュボードで **Add New Project → Import Git Repository** を選択します。
2. Framework は自動で Next.js が選択されます。Build / Output 設定はデフォルト（Build Command: `npm run build`, Output Directory: `.vercel/output`）のままで問題ありません。
3. **Environment Variables** に以下を Production / Preview それぞれへ追加します。

   | Key | Value の例 | 備考 |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxxxxx.supabase.co` | Supabase プロジェクト URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `xxxxxxxx` | Supabase anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | `xxxxxxxx` | サーバ専用の service_role key。**Encrypted** のまま保存します。 |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-project.vercel.app` | Magic Link / 招待メールのリダイレクト先。カスタムドメインを使う場合はその URL。 |
   | `ALLOW_SIGNUP` | `false` など | 本番でメール/パスワード登録を許可するかどうか。 |
   | `NEXT_PUBLIC_BASE_URL` | 任意 | 互換用のエイリアス。指定がなければ空欄のままで問題ありません。 |

   `SUPABASE_SERVICE_ROLE_KEY` はクライアントへ公開されないよう、「Encrypted (Server)」として保存してください。

4. Supabase ダッシュボード > Authentication > URL Configuration で `Site URL` と `Redirect URLs` に手順 3 で設定した `NEXT_PUBLIC_SITE_URL`（および必要なら `NEXT_PUBLIC_SITE_URL/register/*` や `OPS` 画面の URL）を登録します。
5. Deploy を実行すると Vercel 上でビルド・デプロイされます。初回デプロイ後にカスタムドメインを割り当てる場合は `NEXT_PUBLIC_SITE_URL` を更新し再デプロイしてください。

## 使い方
- 未ログインで `/` にアクセスすると `/login` にリダイレクトします。
- `/login` でメールアドレスとパスワードでサインインできます。
  - `ALLOW_SIGNUP=true` のときのみサインアップフォームが表示されます。
  - Supabaseの設定でメール確認を有効にしている場合、サインアップ後に確認メールの対応が必要です。
- サインイン後は `/dashboard` に遷移し、自分の `user_id` と `role` が表示されます。
- `/admin` は `role ∈ {'staff','admin'}` のみアクセス可能です。その他は `/dashboard` にリダイレクトされます。

### 確認テスト（/test/confirm）
- 公開テスト（public.tests.status='published'）が対象です。
- `spec_yaml` に JSON/YAML で実行仕様を定義できます（UI挙動・Editor許可ファイルなど）。
- 例（JSONとして保存可。YAMLも可）:
  ```json
  {
    "timeout_sec": 120,
    "scoring": { "pass_threshold_pct": 80 },
    "ui": { "tabs": ["Editor", "Terminal", "Result"] },
    "input": {
      "files": [
        { "path": "routes/web.php", "label": "routes/web.php", "max_bytes": 65536, "template": "<?php\n// add your Route here\n" }
      ],
      "git_url": false
    }
  }
  ```
- Editor は allowlist（`input.files[].path`）のみ編集可能。リセットで `template` を復元。
- 「環境を準備」→「テストを実行」で結果はページ内に表示（永続保存なし）。

## ロール変更（staff / admin を作成）
1) 対象アカウントを作成
   - `ALLOW_SIGNUP=true` の状態で `/login` からメール+パスワードでサインアップ（または Supabase ダッシュボードから作成）
2) 対象ユーザーの UUID を取得
   - `/dashboard` にログインすると `user_id` が表示されます
   - もしくは Supabase SQL で `select id, email from auth.users;` を実行
3) ロールを変更
   - staff にする場合: `scripts/make-staff.sql` を開き、`<YOUR_USER_UUID>` を置換して Supabase SQL エディタで実行
   - admin にする場合: `scripts/make-admin.sql` を開き、`<YOUR_USER_UUID>` を置換して Supabase SQL エディタで実行
4) 確認
   - 対象アカウントでログインし、`/dashboard` の `role` が期待通りか確認
   - `/admin` は `staff` と `admin` でのみアクセスできます

## 実装メモ
- 認証は Supabase Auth (Email + Password)。サインイン/サインアップ/サインアウトは Server Action で実装し、SSR クッキーに反映されます。
- 認可はサーバ側コンポーネントで実施。`requireRole()` がセッションとプロフィール取得を行い、未ログインは `/login`、ロール不一致は `/dashboard` にリダイレクトします。
- `profiles` テーブルは RLS により「本人のみ参照・更新可」。`role` の更新はアプリ側で admin のみ行う方針（厳格化は本番でポリシー追加推奨）。

## 受入れ基準チェック
- 未ログインで `/` → `/login` にリダイレクト
- サインアップ/ログイン後 `/dashboard` で `user_id` と `role` を表示
- `/admin` は `staff` または `admin` のみ許可、それ以外は `/dashboard` へ
- DB に `profiles` があり、本人のみ自分のレコードを参照・更新できる（RLS ポリシーで実現）

### 拡張受入れ（データ/RLS）
- `courses/lessons/enrollments/progress` が作成済みで RLS が有効
- user は publish + enrollment + unlocked 条件を満たすデータのみ取得可能
- staff/admin はドラフト含む全件参照、作成/更新可能、削除は admin のみ
