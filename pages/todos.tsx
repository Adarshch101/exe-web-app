import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Todo = {
  id: string;
  title: string;
  user_id: string;
  task: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
  file_path?: string | null;
  file_name?: string | null;
  file_url?: string | null;
};

type EditForm = {
  title: string;
  task: string;
  file?: File | null;
};

const BUCKET_NAME = "todo-bucket";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const SIGNED_URL_EXPIRY = 60 * 60; // 1 hour

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

function isImageFile(fileName?: string | null) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName || "");
}

export default function TodosPage() {
  const { user } = useAuth();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [newTask, setNewTask] = useState("");
  const [newDate, setNewDate] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    title: "",
    task: "",
  });

  async function createSignedUrl(filePath: string) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, SIGNED_URL_EXPIRY);

    if (error) {
      console.error("Signed URL error:", error);
      return null;
    }

    return data.signedUrl;
  }

  async function fetchTodos(userId: string) {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      return;
    }

    const todosWithSignedUrls: Todo[] = await Promise.all(
      (data ?? []).map(async (todo: Todo) => {
        if (!todo.file_path) {
          return todo;
        }

        const signedUrl = await createSignedUrl(todo.file_path);

        return {
          ...todo,
          file_url: signedUrl,
        };
      })
    );

    setTodos(todosWithSignedUrls);
  }

  useEffect(() => {
    async function init() {
      if (!user) {
        setLoading(false);
        return;
      }

      await fetchTodos(user.id);
      setLoading(false);
    }

    init();
  }, [user]);

  function openEdit(todo: Todo) {
    setEditingId(String(todo.id));
    setEditForm({
      title: todo.title ?? "",
      task: todo.task ?? "",
      file: null,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({
      title: "",
      task: "",
      file: null,
    });
  }

  function handleCancelAddTodo() {
    setIsAddDialogOpen(false);
    setNewTodo("");
    setNewTask("");
    setNewDate("");
    setSelectedFile(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be less than 5 MB");
      e.target.value = "";
      setSelectedFile(null);
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error("Only images, PDF, Word, Excel, and TXT files are allowed");
      e.target.value = "";
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }

  async function uploadAttachment(file: File) {
    if (!user) {
      throw new Error("User not logged in");
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "file";

    const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");

    const safeFileName = nameWithoutExtension
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9_-]/g, "");

    const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw new Error(uploadError.message);
    }

    return {
      path: filePath,
      name: file.name,
    };
  }

  async function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      toast.error("Please login first");
      return;
    }

    if (!newTodo.trim() || !newTask.trim()) {
      toast.error("Title and task are required");
      return;
    }

    try {
      setUploading(true);

      let filePath: string | null = null;
      let fileName: string | null = null;

      if (selectedFile) {
        const uploadedFile = await uploadAttachment(selectedFile);
        filePath = uploadedFile.path;
        fileName = uploadedFile.name;
      }

      const { data, error } = await supabase
        .from("todos")
        .insert({
          title: newTodo.trim(),
          task: newTask.trim(),
          user_id: user.id,
          completed: false,
          file_path: filePath,
          file_name: fileName,
          file_url: filePath ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${filePath}` : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        // Remove the file if todo database insert fails
        if (filePath) {
          await supabase.storage.from(BUCKET_NAME).remove([filePath]);
        }

        toast.error(error.message);
        return;
      }

      let todoWithUrl: Todo = data;

      if (data.file_path) {
        const signedUrl = await createSignedUrl(data.file_path);

        todoWithUrl = {
          ...data,
          file_url: signedUrl,
        };
      }

      setTodos((prev) => [todoWithUrl, ...prev]);
      toast.success("Todo added successfully");
      handleCancelAddTodo();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "File upload failed"
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleUpdate(id: string) {
    try {
      let filePath: string | null = null;
      let fileName: string | null = null;
      let fileUrl: string | null = null;

      // Get current todo to check for existing file
      const { data: currentTodo } = await supabase
        .from("todos")
        .select("file_path, file_name")
        .eq("id", id)
        .single();

      // If a new file is uploaded
      if (editForm.file) {
        // Delete old file if exists
        if (currentTodo?.file_path) {
          await supabase.storage
            .from(BUCKET_NAME)
            .remove([currentTodo.file_path]);
        }

        const uploadedFile = await uploadAttachment(editForm.file);
        filePath = uploadedFile.path;
        fileName = uploadedFile.name;
        const signedUrl = await createSignedUrl(filePath);
        fileUrl = signedUrl;
      } else {
        // Keep existing file
        filePath = currentTodo?.file_path ?? null;
        fileName = currentTodo?.file_name ?? null;
        fileUrl = filePath ? await createSignedUrl(filePath) : null;
      }

      const { data, error } = await supabase
        .from("todos")
        .update({
          title: editForm.title.trim(),
          task: editForm.task.trim(),
          file_path: filePath,
          file_name: fileName,
          file_url: fileUrl ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${filePath}` : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        toast.error(error.message);
        return;
      }

      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === id
            ? {
              ...data,
              file_url: fileUrl,
            }
            : todo
        )
      );

      toast.success("Todo updated successfully");
      cancelEdit();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update todo"
      );
    }
  }

  async function handleDelete(todo: Todo) {
    try {
      // First delete the uploaded file from Storage
      if (todo.file_path) {
        const { error: fileDeleteError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([todo.file_path]);

        if (fileDeleteError) {
          console.error("File delete error:", fileDeleteError);
          toast.error("Could not delete attached file");
          return;
        }
      }

      // Then delete the todo from database
      const { error } = await supabase
        .from("todos")
        .delete()
        .eq("id", todo.id);

      if (error) {
        toast.error(error.message);
        return;
      }

      setTodos((prev) => prev.filter((item) => item.id !== todo.id));

      toast.success(
        todo.file_path
          ? "Todo and attachment deleted successfully"
          : "Todo deleted successfully"
      );

      if (editingId === String(todo.id)) {
        cancelEdit();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete todo"
      );
    }
  }

  async function handleComplete(id: string) {
    const { error } = await supabase
      .from("todos")
      .update({
        completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id
          ? { ...todo, completed: true }
          : todo
      )
    );

    toast.success("Todo completed successfully");
  }

  async function handleIncomplete(id: string) {
    const { error } = await supabase
      .from("todos")
      .update({
        completed: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id
          ? { ...todo, completed: false }
          : todo
      )
    );

    toast.success("Todo marked incomplete");
  }

  function renderAttachment(todo: Todo) {
    if (!todo.file_url) return null;

    if (isImageFile(todo.file_name)) {
      return (
        <div className="mt-4">
          <a
            href={todo.file_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={todo.file_url}
              alt={todo.file_name || "Todo attachment"}
              className="h-44 w-full max-w-md rounded-md border object-cover"
            />
          </a>

          {todo.file_name && (
            <p className="mt-2 text-sm text-muted-foreground">
              {todo.file_name}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="mt-4">
        <a
          href={todo.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-md border px-3 py-2 text-sm font-medium text-primary underline"
        >
          View document: {todo.file_name || "Attachment"}
        </a>
      </div>
    );
  }

  function renderTodoItem(todo: Todo) {
    const isEditing = editingId === String(todo.id);

    if (isEditing) {
      return (
        <Card key={todo.id} className="mb-4 border-primary/50">
          <CardHeader>
            <CardTitle>Edit Todo</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-title-${todo.id}`}>Title</Label>

              <Input
                id={`edit-title-${todo.id}`}
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    title: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`edit-task-${todo.id}`}>Task</Label>

              <Textarea
                id={`edit-task-${todo.id}`}
                rows={4}
                value={editForm.task}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    task: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`edit-file-${todo.id}`}>
                Update Attachment (Optional)
              </Label>

              <Input
                id={`edit-file-${todo.id}`}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file) {
                    if (file.size > MAX_FILE_SIZE) {
                      toast.error("File size must be less than 5 MB");
                      e.target.value = "";
                      return;
                    }
                    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
                      toast.error("Only images, PDF, Word, Excel, and TXT files are allowed");
                      e.target.value = "";
                      return;
                    }
                    setEditForm({
                      ...editForm,
                      file,
                    });
                  }
                }}
              />

              <p className="text-xs text-muted-foreground">
                Leave empty to keep existing file. Supported: Images, PDF, Word, Excel, TXT. Maximum size: 5 MB.
              </p>

              {todo.file_name && !editForm.file && (
                <div className="rounded-md border bg-muted/40 p-2 text-sm">
                  Current file: <span className="font-medium">{todo.file_name}</span>
                </div>
              )}

              {editForm.file && (
                <div className="rounded-md border bg-muted/40 p-2 text-sm">
                  New file: <span className="font-medium">{editForm.file.name}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => handleUpdate(todo.id)}>Save</Button>

              <Button variant="destructive" onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={todo.id} className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="mb-2">{todo.title}</CardTitle>

              <CardDescription className="text-base">
                {todo.task}
              </CardDescription>

              {renderAttachment(todo)}
            </div>

            <Badge variant={todo.completed ? "default" : "secondary"}>
              {todo.completed ? "Completed" : "Incomplete"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Created: {new Date(todo.created_at).toLocaleDateString()}
          </p>

          <div className="flex flex-wrap gap-2">
            {!todo.completed ? (
              <Button size="sm" onClick={() => handleComplete(todo.id)}>
                Complete
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleIncomplete(todo.id)}
              >
                Mark Incomplete
              </Button>
            )}

            <Button size="sm" variant="outline" onClick={() => openEdit(todo)}>
              Edit
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleDelete(todo)}
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Todos</h1>

        <Button
          type="button"
          size="lg"
          onClick={() => setIsAddDialogOpen(true)}
        >
          Add a new todo
        </Button>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Incomplete Todos</h2>

        {todos.filter((todo) => !todo.completed).length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No incomplete todos.
              </p>
            </CardContent>
          </Card>
        ) : (
          todos.filter((todo) => !todo.completed).map(renderTodoItem)
        )}
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Completed Todos</h2>

        {todos.filter((todo) => todo.completed).length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No completed todos.
              </p>
            </CardContent>
          </Card>
        ) : (
          todos.filter((todo) => todo.completed).map(renderTodoItem)
        )}
      </div>

      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);

          if (!open) {
            handleCancelAddTodo();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Todo</DialogTitle>

            <DialogDescription>
              Create a new todo and optionally attach an image or document.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleAddTodo}>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>

              <Input
                id="title"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="Add a new todo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task">Task</Label>

              <Textarea
                id="task"
                rows={4}
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add a new task"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>

              <Input
                id="date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attachment">
                Upload Image / Document (Optional)
              </Label>

              <Input
                id="attachment"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={handleFileChange}
              />

              <p className="text-xs text-muted-foreground">
                Supported: Images, PDF, Word, Excel, TXT. Maximum size: 5 MB.
              </p>

              {selectedFile && (
                <div className="rounded-md border bg-muted/40 p-2 text-sm">
                  Selected file:{" "}
                  <span className="font-medium">{selectedFile.name}</span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelAddTodo}
                disabled={uploading}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "Add Todo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}