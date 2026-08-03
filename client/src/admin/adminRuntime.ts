export function isAdminHostname(hostname: string): boolean {
  return hostname.toLowerCase().startsWith("admin.");
}

export function shouldRenderAdminApp(): boolean {
  return (
    isAdminHostname(window.location.hostname) ||
    (import.meta.env.DEV &&
      (window.location.pathname === "/admin" ||
        window.location.pathname.startsWith("/admin/")))
  );
}

export function getAdminRouterBasename(): string {
  return isAdminHostname(window.location.hostname) ? "/" : "/admin";
}

export function getPublicAppOrigin(): string {
  const configured = import.meta.env.VITE_PUBLIC_APP_ORIGIN;

  return typeof configured === "string" && configured.trim()
    ? configured.replace(/\/$/u, "")
    : window.location.origin;
}