import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

type RevalidatePayload = {
  token?: string;
  path?: string;
  paths?: string[];
  tag?: string;
  tags?: string[];
};

function readToken(payload: RevalidatePayload, request: Request) {
  const headerToken = request.headers.get('x-revalidate-token') ?? request.headers.get('x-vercel-revalidate-token');
  return payload.token ?? headerToken ?? undefined;
}

function normalize(value?: string | string[]): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
  if (typeof value === 'string' && value.length > 0) return [value];
  return [];
}

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET ?? process.env.ON_DEMAND_REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'Revalidate secret is not configured' }, { status: 500 });
  }

  let payload: RevalidatePayload = {};
  try {
    payload = await request.json();
  } catch {
    // ignore invalid JSON and fall back to defaults
  }

  const token = readToken(payload, request);
  if (token !== secret) {
    return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 });
  }

  const paths = new Set([
    ...normalize(payload.path),
    ...normalize(payload.paths),
  ]);
  const tags = new Set([
    ...normalize(payload.tag),
    ...normalize(payload.tags),
  ]);

  await Promise.all(
    Array.from(paths).map(async (path) => {
      if (!path.startsWith('/')) return;
      revalidatePath(path);
    })
  );

  Array.from(tags).forEach((tag) => {
    if (!tag) return;
    revalidateTag(tag);
  });

  return NextResponse.json({
    ok: true,
    revalidated: {
      paths: Array.from(paths),
      tags: Array.from(tags),
    },
  });
}
