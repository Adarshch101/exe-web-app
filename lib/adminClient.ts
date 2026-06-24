import { supabase } from "@/lib/supabaseClient";
import type { UserRole } from "@/lib/types";

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error) return false;
  return data?.role === "admin";
}

export async function adminFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Not authenticated");
  }

  return fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export type UpdateUserPayload = {
  id: string;
  role: UserRole;
};

export type UpdateTodoPayload = {
  id: string;
  title: string;
  task: string;
  completed: boolean;
  file?: File | null;
};
