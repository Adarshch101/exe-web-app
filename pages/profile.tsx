"use client";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type Todo = {
  id: string;
  title: string;
  user_id: string;
  task: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<Todo[]>([]);

  async function fetchTodos(userId: string) {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
    } else {
      setTodos(data ?? []);
    }
  }

  useEffect(() => {
    async function init() {
      if (!user) return;
      await fetchTodos(user.id);
      setLoading(false);
    }
    init();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="space-y-3 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Welcome, {user.email}</h1>
      <div>
        <p>{user.email}</p>
        <p>You are with us from {user.created_at}</p>
      </div>
      <h3>My Todos</h3>
      <div>
        {todos.map((todo) => (
          <div className="mb-6 gap-4 border-2 p-2 shadow-md" key={todo.id}>
            <p className="font-semibold">{todo.title}</p>
            <p>{todo.task}</p>
            <p>{todo.completed ? "Completed" : "Incomplete"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
