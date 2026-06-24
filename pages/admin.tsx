import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const AdminDashboard = dynamic(
  () => import("@/components/admin-dashboard"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    ),
  }
);

export default function AdminPage() {
  return <AdminDashboard />;
}
