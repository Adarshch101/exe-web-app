"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminClient";
import { supabase } from "@/lib/supabaseClient";
import type { Profile, TodoWithUser, UserRole } from "@/lib/types";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon, FileIcon, ImageIcon } from "lucide-react";

type DeleteTarget =
  | { type: "user"; item: Profile }
  | { type: "todo"; item: TodoWithUser }
  | null;

function isImageFile(fileName?: string | null) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName || "");
}

const BUCKET_NAME = "todo-bucket";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [todos, setTodos] = useState<TodoWithUser[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [editingTodo, setEditingTodo] = useState<TodoWithUser | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    task: "",
    completed: false,
    file: null as File | null,
  });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const [usersRes, todosRes] = await Promise.all([
      adminFetch("/api/admin/users"),
      adminFetch("/api/admin/todos"),
    ]);

    if (!usersRes.ok || !todosRes.ok) {
      throw new Error("Failed to load admin data");
    }

    const [usersData, todosData] = await Promise.all([
      usersRes.json(),
      todosRes.json(),
    ]);

    setUsers(usersData);
    setTodos(todosData);
  }, []);

  useEffect(() => {
    async function init() {
      try {
        await fetchData();
      } catch {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [fetchData]);

  async function handleRoleChange(userId: string, role: UserRole) {
    setSaving(true);
    const res = await adminFetch("/api/admin/users", {
      method: "PATCH",
      body: JSON.stringify({ id: userId, role }),
    });

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to update role");
    } else {
      toast.success(`User role updated to ${role}`);
      await fetchData();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setSaving(true);
    const url =
      deleteTarget.type === "user"
        ? `/api/admin/users?id=${deleteTarget.item.id}`
        : `/api/admin/todos?id=${deleteTarget.item.id}`;

    const res = await adminFetch(url, { method: "DELETE" });

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to delete");
    } else {
      toast.success(
        deleteTarget.type === "user" ? "User deleted" : "Todo deleted"
      );
      await fetchData();
    }

    setDeleteTarget(null);
    setSaving(false);
  }

  function openEditTodo(todo: TodoWithUser) {
    setEditingTodo(todo);
    setEditForm({
      title: todo.title,
      task: todo.task,
      completed: todo.completed,
      file: null,
    });
  }

  async function handleSaveTodo() {
    if (!editingTodo) return;

    setSaving(true);

    try {
      let filePath: string | null = null;
      let fileName: string | null = null;
      let fileUrl: string | null = null;

      // Get current todo to check for existing file
      const { data: currentTodo } = await supabase
        .from("todos")
        .select("file_path, file_name")
        .eq("id", editingTodo.id)
        .single();

      // If a new file is uploaded
      if (editForm.file) {
        // Delete old file if exists
        if (currentTodo?.file_path) {
          await supabase.storage
            .from(BUCKET_NAME)
            .remove([currentTodo.file_path]);
        }

        const extension = editForm.file.name.split(".").pop()?.toLowerCase() || "file";
        const nameWithoutExtension = editForm.file.name.replace(/\.[^/.]+$/, "");
        const safeFileName = nameWithoutExtension
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9_-]/g, "");
        const filePathNew = `${editingTodo.user_id}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePathNew, editForm.file, {
            cacheControl: "3600",
            upsert: false,
            contentType: editForm.file.type,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        filePath = filePathNew;
        fileName = editForm.file.name;

        const { data: signedUrlData } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(filePath, 60 * 60);
        fileUrl = signedUrlData?.signedUrl ?? null;
      } else {
        // Keep existing file
        filePath = currentTodo?.file_path ?? null;
        fileName = currentTodo?.file_name ?? null;
        if (filePath) {
          const { data: signedUrlData } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(filePath, 60 * 60);
          fileUrl = signedUrlData?.signedUrl ?? null;
        }
      }

      const res = await adminFetch("/api/admin/todos", {
        method: "PATCH",
        body: JSON.stringify({
          id: editingTodo.id,
          title: editForm.title,
          task: editForm.task,
          completed: editForm.completed,
          file_path: filePath,
          file_name: fileName,
          file_url: fileUrl ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${filePath}` : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to update todo");
      } else {
        toast.success("Todo updated");
        setEditingTodo(null);
        await fetchData();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update todo");
    }

    setSaving(false);
  }

  async function toggleTodoComplete(todo: TodoWithUser) {
    setSaving(true);
    const res = await adminFetch("/api/admin/todos", {
      method: "PATCH",
      body: JSON.stringify({
        id: todo.id,
        title: todo.title,
        task: todo.task,
        completed: !todo.completed,
      }),
    });

    if (!res.ok) {
      toast.error("Failed to update todo status");
    } else {
      await fetchData();
    }
    setSaving(false);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage all users and todos across the platform
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{users.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Todos</CardDescription>
            <CardTitle className="text-3xl">{todos.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed Todos</CardDescription>
            <CardTitle className="text-3xl">
              {todos.filter((t) => t.completed).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="todos">
        <TabsList>
          <TabsTrigger value="todos">Todos ({todos.length})</TabsTrigger>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="todos">
          <Card>
            <CardHeader>
              <CardTitle>All Todos</CardTitle>
              <CardDescription>
                View, edit, and delete todos from all users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No todos found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Attachment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[70px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todos.map((todo) => (
                      <TableRow key={todo.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{todo.title}</p>
                            <p className="max-w-xs truncate text-xs text-muted-foreground">
                              {todo.task}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {todo.profiles?.email ?? "Unknown"}
                        </TableCell>
                        <TableCell>
                          {todo.file_name ? (
                            <div className="flex items-center gap-2">
                              {isImageFile(todo.file_name) ? (
                                <ImageIcon className="h-4 w-4" />
                              ) : (
                                <FileIcon className="h-4 w-4" />
                              )}
                              {todo.file_url ? (
                                <a
                                  href={todo.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline"
                                >
                                  {todo.file_name}
                                </a>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  {todo.file_name}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={todo.completed ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => toggleTodoComplete(todo)}
                          >
                            {todo.completed ? "Completed" : "Incomplete"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(todo.created_at)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontalIcon />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEditTodo(todo)}
                              >
                                <PencilIcon />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  setDeleteTarget({ type: "todo", item: todo })
                                }
                              >
                                <Trash2Icon />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                Manage user roles and remove accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-[70px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.email ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "admin" ? "default" : "secondary"
                            }
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontalIcon />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {user.role === "user" ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleRoleChange(user.id, "admin")
                                  }
                                  disabled={saving}
                                >
                                  Make Admin
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleRoleChange(user.id, "user")
                                  }
                                  disabled={saving}
                                >
                                  Remove Admin
                                </DropdownMenuItem>
                              )}
                              {
                                user.role !== "admin" &&(
                                  <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  setDeleteTarget({ type: "user", item: user })
                                }
                              >
                                <Trash2Icon />
                                Delete User
                              </DropdownMenuItem>
                                )
                              }
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!editingTodo}
        onOpenChange={(open) => !open && setEditingTodo(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Todo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-task">Task</Label>
              <Input
                id="edit-task"
                value={editForm.task}
                onChange={(e) =>
                  setEditForm({ ...editForm, task: e.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-completed"
                checked={editForm.completed}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, completed: checked === true })
                }
              />
              <Label htmlFor="edit-completed">Completed</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-file">Update Attachment (Optional)</Label>
              <Input
                id="edit-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("File size must be less than 5 MB");
                      e.target.value = "";
                      return;
                    }
                    setEditForm({ ...editForm, file });
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to keep existing file. Maximum size: 5 MB.
              </p>
              {editingTodo?.file_name && !editForm.file && (
                <div className="rounded-md border bg-muted/40 p-2 text-sm">
                  Current file: <span className="font-medium">{editingTodo.file_name}</span>
                </div>
              )}
              {editForm.file && (
                <div className="rounded-md border bg-muted/40 p-2 text-sm">
                  New file: <span className="font-medium">{editForm.file.name}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingTodo(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTodo} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.type === "user" ? "user" : "todo"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "user"
                ? `This will permanently delete ${deleteTarget.item.email}'s account and all associated data.`
                : `This will permanently delete the todo "${deleteTarget?.item.title}".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
