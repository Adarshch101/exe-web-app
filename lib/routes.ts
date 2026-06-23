export type RouteAccess = "public" | "auth" | "admin" | "guest";

export const routeAccess: Record<string, RouteAccess> = {
  "/": "public",
  "/login": "guest",
  "/signup": "guest",
  "/reset-password": "public",
  "/todos": "auth",
  "/profile": "auth",
  "/admin": "admin",
};

export function getRouteAccess(pathname: string): RouteAccess {
  const path = pathname.split("?")[0];
  return routeAccess[path] ?? "public";
}

export const AUTH_LOGIN_PATH = "/login";

export function getLoginUrl(redirectTo?: string): string {
  if (!redirectTo || redirectTo === AUTH_LOGIN_PATH) {
    return AUTH_LOGIN_PATH;
  }
  return `${AUTH_LOGIN_PATH}?redirect=${encodeURIComponent(redirectTo)}`;
}

export function getSafeRedirect(path: string | string[] | undefined): string {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    return "/todos";
  }
  return path;
}
