import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">Welcome to Todo App</h1>
      <p className="text-lg text-gray-600">Manage your tasks efficiently</p>
      <Button> <a href="/login" className="text-white">Login</a> </Button>
      <Button> <a href="/signup" className="text-white">Signup</a> </Button>

      
    </div>
  );
}
