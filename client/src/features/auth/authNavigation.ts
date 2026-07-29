import type {
  Location,
} from "react-router";

import type {
  AuthVerificationReceipt,
} from "../../types/auth";

export const AUTH_ROUTE_PATHS = [
  "/login",
  "/register",
  "/registration-pending",
  "/verify-email",
] as const;

export type AuthRoutePath =
  (typeof AUTH_ROUTE_PATHS)[number];

export interface AuthRouteLocationState {
  backgroundLocation?: Location;
  returnTo?: string;

  verification?: AuthVerificationReceipt;
  email?: string;
}

export function isAuthRoutePath(
  pathname: string,
): pathname is AuthRoutePath {
  return AUTH_ROUTE_PATHS.includes(
    pathname as AuthRoutePath,
  );
}

export function isSafeInternalReturnTo(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !AUTH_ROUTE_PATHS.some(
      (path) =>
        value.startsWith(path),
    )
  );
}

export function getLocationHref(
  location: Pick<
    Location,
    "pathname" | "search" | "hash"
  >,
): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

export function readAuthRouteState(
  value: unknown,
): AuthRouteLocationState {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return {};
  }

  return value as AuthRouteLocationState;
}

export function createAuthRouteState(
  location: Location,
): AuthRouteLocationState {
  return {
    backgroundLocation: location,
    returnTo:
      getLocationHref(location),
  };
}

export function getAuthReturnTo(
  state: AuthRouteLocationState,
  fallback = "/",
): string {
  return isSafeInternalReturnTo(
    state.returnTo,
  )
    ? state.returnTo
    : fallback;
}
