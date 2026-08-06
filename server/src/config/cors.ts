import { env } from "./env.js";

const DEVELOPMENT_CLIENT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.1.2:5173",
  "http://192.168.1.3:5173",
  "http://192.168.1.4:5173",
  "http://192.168.17.250:5173",
] as const;

export const ADMIN_APP_ORIGIN =
  env.ADMIN_APP_ORIGIN ?? env.CLIENT_APP_ORIGIN;

export const ALLOWED_CLIENT_ORIGINS = Array.from(
  new Set<string>([
    env.CLIENT_APP_ORIGIN,
    ...DEVELOPMENT_CLIENT_ORIGINS,
  ]),
);

export const ALLOWED_CORS_ORIGINS = Array.from(
  new Set<string>([
    ...ALLOWED_CLIENT_ORIGINS,
    ADMIN_APP_ORIGIN,
  ]),
);

const allowedClientOriginSet = new Set<string>(ALLOWED_CLIENT_ORIGINS);
const allowedCorsOriginSet = new Set<string>(ALLOWED_CORS_ORIGINS);
const allowedAdminOriginSet = new Set<string>([
  ADMIN_APP_ORIGIN,
  ...(env.NODE_ENV === "development"
    ? DEVELOPMENT_CLIENT_ORIGINS
    : []),
]);

export function isAllowedClientOrigin(origin: string): boolean {
  return allowedClientOriginSet.has(origin);
}

export function isAllowedCorsOrigin(origin: string): boolean {
  return allowedCorsOriginSet.has(origin);
}

export function isAllowedAdminOrigin(origin: string): boolean {
  return allowedAdminOriginSet.has(origin);
}

export function resolveClientOrigin(
  requestOrigin: string | undefined,
): string {
  if (requestOrigin && isAllowedClientOrigin(requestOrigin)) {
    return requestOrigin;
  }

  return env.CLIENT_APP_ORIGIN;
}
