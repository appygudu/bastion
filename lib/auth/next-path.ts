export function safeNext(path: string | undefined): string {
  if (!path || path.includes("\\") || path.includes("://") || !path.startsWith("/")) return "/app";
  if (path === "/app" || path.startsWith("/app/") || path.startsWith("/invite/")) return path;
  return "/app";
}
