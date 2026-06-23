export type UserRole = "user" | "admin";

export type Profile = {
  id: string;
  email: string | null;
  role: UserRole;
  created_at: string;
};

export type Todo = {
  id: string;
  title: string;
  user_id: string;
  task: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export type TodoWithUser = Todo & {
  profiles: { email: string | null } | null;
};
