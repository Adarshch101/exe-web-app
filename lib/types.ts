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
  file_path?: string | null;
  file_name?: string | null;
  file_url?: string | null;
};

export type TodoWithUser = Todo & {
  profiles: { email: string | null } | null;
};
