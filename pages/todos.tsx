import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type Todo = {
    id: string;
    title: string;
    user_id: string;
    task: string;
    completed: boolean;
    created_at: string;
    updated_at: string;
};

type EditForm = {
    title: string;
    task: string;
};

export default function TodosPage() {
    const { user } = useAuth();
    const [todos, setTodos] = useState<Todo[]>([]);
    const [newTodo, setNewTodo] = useState("");
    const [loading, setLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newTask, setNewTask] = useState("");
    const [newDate, setNewDate] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<EditForm>({ title: "", task: "" });

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

    function openEdit(todo: Todo) {
        setEditingId(String(todo.id));
        setEditForm({
            title: todo.title ?? "",
            task: todo.task ?? "",
        });
    }

    function cancelEdit() {
        setEditingId(null);
        setEditForm({ title: "", task: "" });
    }

    async function handleDelete(id: string) {
        const { error } = await supabase.from("todos").delete().eq("id", id);
        if (error) {
            toast.error(error.message);
        } else {
            setTodos((prev) => prev.filter((todo) => todo.id !== id));
            toast.success("Todo deleted successfully");
            if (editingId === String(id)) cancelEdit();
        }
    }

    async function handleAddTodo(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;

        const { data, error } = await supabase
            .from("todos")
            .insert({
                title: newTodo,
                task: newTask,
                user_id: user.id,
                completed: false,
                created_at: new Date(),
                updated_at: new Date(),
            })
            .select()
            .single();

        if (error) {
            toast.error(error.message);
        } else {
            setTodos((prev) => [data, ...prev]);
            toast.success("Todo added successfully");
            handleCancelAddTodo();
        }
    }

    async function handleUpdate(id: string) {
        const { data, error } = await supabase
            .from("todos")
            .update({
                title: editForm.title,
                task: editForm.task,
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            toast.error(error.message);
        } else {
            setTodos((prev) => prev.map((todo) => (todo.id === id ? data : todo)));
            toast.success("Todo updated successfully");
            cancelEdit();
        }
    }

    async function handleComplete(id: string) {
        const { error } = await supabase.from("todos").update({ completed: true }).eq("id", id);
        if (error) {
            toast.error(error.message);
        } else {
            setTodos((prev) =>
                prev.map((todo) => (todo.id === id ? { ...todo, completed: true } : todo))
            );
            toast.success("Todo completed successfully");
        }
    }

    async function handleIncomplete(id: string) {
        const { error } = await supabase.from("todos").update({ completed: false }).eq("id", id);
        if (error) {
            toast.error(error.message);
        } else {
            setTodos((prev) =>
                prev.map((todo) => (todo.id === id ? { ...todo, completed: false } : todo))
            );
            toast.success("Todo marked incomplete");
        }
    }

    function handleCancelAddTodo() {
        setIsAddDialogOpen(false);
        setNewTodo("");
        setNewTask("");
        setNewDate("");
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
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`edit-task-${todo.id}`}>Task</Label>
                            <Textarea
                                id={`edit-task-${todo.id}`}
                                rows={4}
                                value={editForm.task}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditForm({ ...editForm, task: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => handleUpdate(todo.id)}>Save</Button>
                            <Button variant="destructive" onClick={cancelEdit}>Cancel</Button>
                        </div>
                    </CardContent>
                </Card>
            );
        }

        return (
            <Card key={todo.id} className="mb-4">
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
                    <p className="text-sm text-muted-foreground mb-4">
                        Created: {new Date(todo.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {!todo.completed ? (
                            <Button size="sm" onClick={() => handleComplete(todo.id)}>
                                Complete
                            </Button>
                        ) : (
                            <Button size="sm" variant="outline" onClick={() => handleIncomplete(todo.id)}>
                                Mark Incomplete
                            </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openEdit(todo)}>
                            Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(todo.id)}>
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
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">My Todos</h1>
                    <Button
                        type="button"
                        size="lg"
                        onClick={() => setIsAddDialogOpen(true)}
                    >
                        Add a new todo
                    </Button>
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Incomplete Todos</h2>
                {todos.filter((todo) => !todo.completed).length === 0 ? (
                    <Card>
                        <CardContent className="py-8">
                            <p className="text-center text-muted-foreground">No incomplete todos.</p>
                        </CardContent>
                    </Card>
                ) : (
                    todos.filter((todo) => !todo.completed).map(renderTodoItem)
                )}
            </div>

            <div>
                <h2 className="text-2xl font-bold mb-4">Completed Todos</h2>
                {todos.filter((todo) => todo.completed).length === 0 ? (
                    <Card>
                        <CardContent className="py-8">
                            <p className="text-center text-muted-foreground">No completed todos.</p>
                        </CardContent>
                    </Card>
                ) : (
                    todos.filter((todo) => todo.completed).map(renderTodoItem)
                )}
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add New Todo</DialogTitle>
                        <DialogDescription>
                            Create a new todo to track your tasks
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={handleAddTodo}>
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={newTodo}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTodo(e.target.value)}
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
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTask(e.target.value)}
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
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancelAddTodo}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">Add Todo</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
