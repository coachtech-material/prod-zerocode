const DEFAULT_BASE_URL =
  process.env.INTERNAL_REVALIDATE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.SUPABASE_SITE_URL ??
  'http://localhost:3000';

type RevalidateOptions = {
  paths?: Array<string | null | undefined>;
  tags?: Array<string | null | undefined>;
};

function normalizePath(path: string) {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      return url.pathname || '/';
    } catch {
      return null;
    }
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`;
}

export async function triggerRevalidate({ paths, tags }: RevalidateOptions) {
  const secret = process.env.REVALIDATE_SECRET ?? process.env.ON_DEMAND_REVALIDATE_SECRET;
  if (!secret) {
    console.warn('[revalidate] REVALIDATE_SECRET is not configured; skipping on-demand revalidate.');
    return;
  }

  const normalizedPaths = Array.from(
    new Set((paths || []).map((path) => (path ? normalizePath(path) : null)).filter(Boolean) as string[])
  );
  const normalizedTags = Array.from(
    new Set((tags || []).map((tag) => (tag ? String(tag).trim() : null)).filter(Boolean) as string[])
  );

  if (!normalizedPaths.length && !normalizedTags.length) return;

  const endpoint = new URL('/api/revalidate', DEFAULT_BASE_URL);

  try {
    await fetch(endpoint.toString(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-revalidate-token': secret,
      },
      body: JSON.stringify({ paths: normalizedPaths, tags: normalizedTags }),
      cache: 'no-store',
    });
  } catch (error) {
    console.error('[revalidate] Failed to trigger revalidate', error);
  }
}
