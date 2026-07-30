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
  "/forgot-password",
  "/reset-password",
] as const;

export type AuthRoutePath =
  (typeof AUTH_ROUTE_PATHS)[number];

export interface AuthRouteLocationState {
  backgroundLocation?: Location;
  returnTo?: string;

  verification?: AuthVerificationReceipt;
  email?: string;
  notice?: string;
}

export function isAuthRoutePath(
  pathname: string,
): boolean {
  return AUTH_ROUTE_PATHS.some(
    (path) =>
      pathname === path ||
      (path === "/reset-password" &&
        pathname.startsWith(
          "/reset-password/",
        )),
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
        value === path ||
        value.startsWith(
          `${path}/`,
        ),
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
