import type { NextApiRequest, NextApiResponse } from "next";
import { verifyAdmin, getSupabaseAdmin } from "@/lib/adminAuth";

const BUCKET_NAME = "todo-bucket";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const result = await verifyAdmin(req);
  if (!result) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { supabase } = result;
  const writeClient = getSupabaseAdmin() ?? supabase;

  if (req.method === "GET") {
    const [{ data: todos, error: todosError }, { data: profiles, error: profilesError }] =
      await Promise.all([
        supabase
          .from("todos")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, email"),
      ]);

    if (todosError) {
      return res.status(500).json({ error: todosError.message });
    }

    if (profilesError) {
      return res.status(500).json({ error: profilesError.message });
    }

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.email])
    );

    const data = (todos ?? []).map((todo) => ({
      ...todo,
      profiles: { email: profileMap.get(todo.user_id) ?? null },
    }));

    return res.status(200).json(data);
  }

  if (req.method === "PATCH") {
    const { id, title, task, completed, file_path, file_name, file_url } = req.body as {
      id?: string;
      title?: string;
      task?: string;
      completed?: boolean;
      file_path?: string | null;
      file_name?: string | null;
      file_url?: string | null;
    };

    if (!id || title === undefined || task === undefined || completed === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data, error } = await writeClient
      .from("todos")
      .update({
        title,
        task,
        completed,
        file_path,
        file_name,
        file_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "Todo not found" });
    }

    return res.status(200).json(data);
  }

  if (req.method === "DELETE") {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Missing todo id" });
    }

    // Get the todo to check for file attachment
    const { data: todo } = await writeClient
      .from("todos")
      .select("file_path")
      .eq("id", id)
      .maybeSingle();

    // Delete file from storage if exists
    if (todo?.file_path) {
      const { error: fileDeleteError } = await writeClient.storage
        .from(BUCKET_NAME)
        .remove([todo.file_path]);

      if (fileDeleteError) {
        console.error("File delete error:", fileDeleteError);
      }
    }

    const { error } = await writeClient.from("todos").delete().eq("id", id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
