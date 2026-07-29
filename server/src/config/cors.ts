

export const ALLOWED_CLIENT_ORIGINS = [
  "http://localhost:5173",
  "http://192.168.1.2:5173",
  "http://192.168.1.3:5173",
  "http://192.168.1.4:5173",
  "http://192.168.17.250:5173",
] as const;

const allowedClientOriginSet = new Set<string>(
  ALLOWED_CLIENT_ORIGINS,
);

export function isAllowedClientOrigin(
  origin: string,
): boolean {
  return allowedClientOriginSet.has(origin);
}
