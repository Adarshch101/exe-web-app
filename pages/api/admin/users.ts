import type { NextApiRequest, NextApiResponse } from "next";
import { verifyAdmin, getSupabaseAdmin } from "@/lib/adminAuth";
import type { UserRole } from "@/lib/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const result = await verifyAdmin(req);
  if (!result) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { user: admin, supabase } = result;

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  if (req.method === "PATCH") {
    const { id, role } = req.body as { id?: string; role?: UserRole };

    if (!id || !role || !["user", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid id or role" });
    }

    if (id === admin.id && role !== "admin") {
      return res.status(400).json({ error: "You cannot remove your own admin role" });
    }

    const { data, error } = await supabase.rpc("update_user_role", {
      target_id: id,
      new_role: role,
    });

    if (error) {
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        const { data: fallbackData, error: fallbackError } = await supabaseAdmin
          .from("profiles")
          .update({ role })
          .eq("id", id)
          .select()
          .maybeSingle();

        if (fallbackError) {
          return res.status(500).json({ error: fallbackError.message });
        }

        if (!fallbackData) {
          return res.status(404).json({ error: "User profile not found" });
        }

        return res.status(200).json(fallbackData);
      }

      return res.status(500).json({
        error:
          error.message.includes("Could not find the function")
            ? "Run supabase/admin_setup.sql in Supabase SQL Editor, then try again"
            : error.message,
      });
    }

    return res.status(200).json(data);
  }

  if (req.method === "DELETE") {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Missing user id" });
    }

    if (id === admin.id) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return res.status(503).json({
        error:
          "User deletion requires SUPABASE_SERVICE_ROLE_KEY in your .env file",
      });
    }

    // Check if target user is an admin
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", id)
      .single();

    if (targetProfile?.role === "admin") {
      return res.status(400).json({ error: "You cannot delete another admin" });
    }

    console.log("Attempting to delete user with ID:", id);
    console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("Service role key present:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Test if service role key works by listing users
    console.log("Testing service role key...");
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    console.log("List users result:", { users: users?.users?.length, error: listError?.message });

    // First, delete the auth user (this should cascade to profile)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      console.error("Auth user deletion error:", authError);
      return res.status(500).json({ 
        error: `Failed to delete auth user: ${authError.message}. 
                The user may still be able to login. 
                Check your SUPABASE_SERVICE_ROLE_KEY and network connection.` 
      });
    }

    // Then delete the profile (in case cascade didn't work)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", id);

    if (profileError) {
      console.error("Profile deletion error:", profileError);
      // Profile might already be deleted via cascade, so this is okay
    }

    console.log("Successfully deleted user:", id);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
