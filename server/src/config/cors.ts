import { env } from "./env.js";

const DEVELOPMENT_CLIENT_ORIGINS = [
  "http://localhost:5173",
  "http://192.168.1.2:5173",
  "http://192.168.1.3:5173",
  "http://192.168.1.4:5173",
  "http://192.168.17.250:5173",
] as const;

export const ALLOWED_CLIENT_ORIGINS = Array.from(
  new Set<string>([
    env.CLIENT_APP_ORIGIN,
    ...DEVELOPMENT_CLIENT_ORIGINS,
  ]),
);

const allowedClientOriginSet = new Set<string>(
  ALLOWED_CLIENT_ORIGINS,
);

export function isAllowedClientOrigin(
  origin: string,
): boolean {
  return allowedClientOriginSet.has(origin);
}

export function resolveClientOrigin(
  requestOrigin: string | undefined,
): string {
  if (
    requestOrigin &&
    isAllowedClientOrigin(requestOrigin)
  ) {
    return requestOrigin;
  }

  return env.CLIENT_APP_ORIGIN;
}
