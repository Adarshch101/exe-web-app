"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/components/AuthProvider";
import { getLoginUrl, getRouteAccess, getSafeRedirect } from "@/lib/routes";
import { Skeleton } from "@/components/ui/skeleton";

export default function RouteGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (loading || !router.isReady) return;

    const access = getRouteAccess(router.pathname);

    if (access === "guest" && user) {
      router.replace(getSafeRedirect(router.query.redirect));
      setAllowed(false);
      return;
    }

    if (access === "auth" && !user) {
      router.replace(getLoginUrl(router.asPath));
      setAllowed(false);
      return;
    }

    if (access === "admin") {
      if (!user) {
        router.replace(getLoginUrl(router.asPath));
        setAllowed(false);
        return;
      }

      if (!isAdmin) {
        router.replace("/");
        setAllowed(false);
        return;
      }
    }

    setAllowed(true);
  }, [loading, router.isReady, router.pathname, router.asPath, router.query.redirect, user, isAdmin, router.replace]);

  if (loading || !router.isReady || !allowed) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-6">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
