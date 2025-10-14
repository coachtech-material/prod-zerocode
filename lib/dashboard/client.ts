export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    let message = 'request_failed';
    try {
      const text = await res.text();
      message = text || message;
    } catch {
      // noop
    }
    throw new Error(message);
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}
