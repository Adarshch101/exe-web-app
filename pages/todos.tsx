import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
    const [showAddTodo, setShowAddTodo] = useState(false);
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

    async function handleAddTodo(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!user) return;

        const { data, error } = await supabase
            .from("todos")
            .insert({
                title: newTodo,
                task: newTask,
                user_id: user.id,
                completed: false,
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
        setShowAddTodo(false);
        setNewTodo("");
        setNewTask("");
        setNewDate("");
    }

    function renderTodoItem(todo: Todo) {
        const isEditing = editingId === String(todo.id);

        if (isEditing) {
            return (
                <div
                    key={todo.id}
                    className="flex flex-col gap-4 shadow-md p-4 rounded-md mb-4 border border-blue-200 bg-blue-50"
                >
                    <h2 className="text-lg font-semibold">Edit Todo</h2>
                    <div className="flex flex-col gap-2">
                        <label htmlFor={`edit-title-${todo.id}`} className="text-lg font-semibold">
                            Title
                        </label>
                        <Input
                            id={`edit-title-${todo.id}`}
                            type="text"
                            className="w-full border-2 border-gray-300 rounded-md p-2"
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label htmlFor={`edit-task-${todo.id}`} className="text-lg font-semibold">
                            Task
                        </label>
                        <textarea
                            id={`edit-task-${todo.id}`}
                            rows={4}
                            className="w-full border-2 border-gray-300 rounded-md p-2"
                            value={editForm.task}
                            onChange={(e) => setEditForm({ ...editForm, task: e.target.value })}
                        />
                    </div>
                    <div className="flex gap-4">
                        <Button
                            type="button"
                            onClick={() => handleUpdate(todo.id)}
                            className="bg-blue-500 hover:bg-blue-600"
                        >
                            Save
                        </Button>
                        <Button
                            type="button"
                            onClick={cancelEdit}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            );
        }

        return (
            <div
                key={todo.id}
                className="flex flex-col gap-2 shadow-md p-4 rounded-md mb-4 border border-gray-200"
            >
                <p className="font-semibold">{todo.title}</p>
                <p>{todo.task}</p>
                <p className="text-sm text-gray-500">{todo.created_at}</p>
                <div className="flex flex-wrap gap-2">
                    {!todo.completed ? (
                        <Button
                            type="button"
                            onClick={() => handleComplete(todo.id)}
                            className="bg-green-500 hover:bg-green-600"
                        >
                            Complete
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={() => handleIncomplete(todo.id)}
                            className="bg-yellow-500 hover:bg-yellow-600"
                        >
                            Mark Incomplete
                        </Button>
                    )}
                    <Button
                        type="button"
                        onClick={() => openEdit(todo)}
                        className="bg-blue-500 hover:bg-blue-600"
                    >
                        Update
                    </Button>
                    <Button
                        type="button"
                        onClick={() => handleDelete(todo.id)}
                        className="bg-red-500 hover:bg-red-600"
                    >
                        Delete
                    </Button>
                </div>
            </div>
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
                        className="text-lg font-bold bg-green-500 hover:bg-green-600 hover:cursor-pointer"
                        onClick={() => setShowAddTodo(!showAddTodo)}
                    >
                        Add a new todo
                    </Button>
                </div>
                {showAddTodo && (
                    <div className="flex w-full items-center justify-center flex-col gap-4 shadow-md p-4 rounded-md mb-6">
                        <form className="flex flex-col gap-4 w-full max-w-lg" onSubmit={handleAddTodo}>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="title" className="text-lg font-semibold">
                                    Title
                                </label>
                                <Input
                                    type="text"
                                    className="w-full mb-4 border-2 border-gray-300 rounded-md p-2"
                                    value={newTodo}
                                    onChange={(e) => setNewTodo(e.target.value)}
                                    placeholder="Add a new todo"
                                    id="title"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="task" className="text-lg font-semibold">
                                    Task
                                </label>
                                <textarea
                                    rows={4}
                                    className="w-full mb-4 border-2 border-gray-300 rounded-md p-2"
                                    value={newTask}
                                    onChange={(e) => setNewTask(e.target.value)}
                                    placeholder="Add a new task"
                                    id="task"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="date" className="text-lg font-semibold">
                                    Date
                                </label>
                                <Input
                                    type="date"
                                    className="w-full mb-4 border-2 border-gray-300 rounded-md p-2"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    id="date"
                                />
                            </div>
                            <div className="flex gap-4">
                                <Button type="submit" className="w-1/2 bg-green-500 hover:bg-green-600">
                                    Add
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleCancelAddTodo}
                                    className="w-1/2 bg-red-500 hover:bg-red-600"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-4">Incomplete Todos</h1>
                {todos.filter((todo) => !todo.completed).length === 0 ? (
                    <p className="text-gray-500">No incomplete todos.</p>
                ) : (
                    todos.filter((todo) => !todo.completed).map(renderTodoItem)
                )}
            </div>

            <div>
                <h1 className="text-2xl font-bold mb-4">Complete Todos</h1>
                {todos.filter((todo) => todo.completed).length === 0 ? (
                    <p className="text-gray-500">No completed todos.</p>
                ) : (
                    todos.filter((todo) => todo.completed).map(renderTodoItem)
                )}
            </div>
        </div>
    );
}
