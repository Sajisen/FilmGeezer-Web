import { env } from "../../config/env.js";
import { AdminPasskeyConfigurationError } from "./admin.errors.js";

export interface AdminWebAuthnConfiguration {
  rpName: string;
  rpId: string;
  origin: string;
}

export function isAdminWebAuthnConfigured(): boolean {
  return Boolean(
    env.ADMIN_WEBAUTHN_RP_ID &&
      env.ADMIN_WEBAUTHN_ORIGIN,
  );
}

export function getAdminWebAuthnConfiguration(): AdminWebAuthnConfiguration {
  if (!env.ADMIN_WEBAUTHN_RP_ID || !env.ADMIN_WEBAUTHN_ORIGIN) {
    throw new AdminPasskeyConfigurationError();
  }

  return {
    rpName: env.ADMIN_WEBAUTHN_RP_NAME,
    rpId: env.ADMIN_WEBAUTHN_RP_ID,
    origin: env.ADMIN_WEBAUTHN_ORIGIN,
  };
}
