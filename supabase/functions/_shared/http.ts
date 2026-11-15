import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
export const fail = (error: string, status = 400) => json({ error }, status);

/** Service-role client: bypasses RLS. Never exposed to clients. */
export function admin(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
}

/** Validates the caller's JWT and returns their user id. */
export async function requireUser(req: Request): Promise<string> {
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError('unauthorized', 401);
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data.user) throw new HttpError('unauthorized', 401);
  return data.user.id;
}

export class HttpError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}

export function handler(fn: (req: Request, body: Record<string, unknown>) => Promise<Response>) {
  return async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return fail('method_not_allowed', 405);
    try {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      return await fn(req, body);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.code, e.status);
      const msg = e instanceof Error ? e.message : 'error';
      // Postgres business errors raised with RAISE EXCEPTION come back as messages.
      if (['insufficient', 'already_claimed', 'already_migrated', 'conflict', 'rate_limited'].includes(msg)) return fail(msg, 409);
      console.error(e);
      return fail('internal', 500);
    }
  };
}

/** Converts a Postgres RPC error into an HttpError with the business code. */
export function rpcError(error: { message: string } | null): never | void {
  if (!error) return;
  const known = ['insufficient', 'already_claimed', 'already_migrated', 'conflict', 'rate_limited'];
  const code = known.find((k) => error.message.includes(k));
  if (code) throw new HttpError(code, 409);
  if (error.message.includes('duplicate key') && error.message.includes('processed_requests')) throw new HttpError('duplicate_request', 409);
  throw new Error(error.message);
}

export function randomHex(bytes = 32): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
