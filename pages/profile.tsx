"use client";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Mail } from "lucide-react";
import Link from "next/link";

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
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Profile</h1>
        <p className="text-muted-foreground">Manage your account and view your todos</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Account Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Member Since</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{todos.length}</p>
                <p className="text-sm text-muted-foreground">Total Todos</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{todos.filter(t => t.completed).length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{todos.filter(t => !t.completed).length}</p>
                <p className="text-sm text-muted-foreground">Incomplete</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">My Todos</h2>
        {todos.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">No todos yet. Create your first todo!</p>
              <div className="flex justify-center mt-4">
                <Button asChild>
                  <Link href="/todos">Go to Todos</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {todos.map((todo) => (
              <Card key={todo.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="mb-2">{todo.title}</CardTitle>
                      <CardDescription className="text-base">{todo.task}</CardDescription>
                    </div>
                    <Badge variant={todo.completed ? "default" : "secondary"}>
                      {todo.completed ? "Completed" : "Incomplete"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(todo.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
