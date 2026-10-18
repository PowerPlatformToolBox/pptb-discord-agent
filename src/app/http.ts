/**
 * Shared HTTP helpers for Web-standard Request/Response handlers
 */

export const MAX_BODY_BYTES = 4 * 1024 * 1024; // Vercel's request body limit is 4.5 MB

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Read the raw body (needed verbatim for signature checks); null when too large.
 */
export async function readRawBody(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return null;
  const body = await request.text();
  return Buffer.byteLength(body) > MAX_BODY_BYTES ? null : body;
}

export function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}
