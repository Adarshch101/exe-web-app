import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextApiRequest } from "next";
import type { User } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

function getTokenFromRequest(req: NextApiRequest): string | null {
  return req.headers.authorization?.replace("Bearer ", "") ?? null;
}

export function createSupabaseWithToken(token: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  adminClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return adminClient;
}

export async function verifyAdmin(
  req: NextApiRequest
): Promise<{ user: User; supabase: SupabaseClient } | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  const supabase = createSupabaseWithToken(token);
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;

  return { user, supabase };
}
