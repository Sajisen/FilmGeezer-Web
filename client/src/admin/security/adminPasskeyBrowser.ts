import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
  WebAuthnError,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/browser";

export function supportsAdminPasskeys(): boolean {
  return browserSupportsWebAuthn();
}

export async function hasPlatformAdminAuthenticator(): Promise<boolean> {
  if (!supportsAdminPasskeys()) return false;

  try {
    return await platformAuthenticatorIsAvailable();
  } catch {
    return false;
  }
}

export function isPasskeyPromptCancellation(error: unknown): boolean {
  if (error instanceof WebAuthnError) {
    return (
      error.code === "ERROR_CEREMONY_ABORTED" ||
      error.name === "NotAllowedError" ||
      error.name === "AbortError"
    );
  }

  return (
    error instanceof DOMException &&
    (error.name === "NotAllowedError" || error.name === "AbortError")
  );
}

export function createAdminPasskey(
  optionsJSON: PublicKeyCredentialCreationOptionsJSON,
): Promise<RegistrationResponseJSON> {
  return startRegistration({ optionsJSON });
}

export function authenticateAdminPasskey(
  optionsJSON: PublicKeyCredentialRequestOptionsJSON,
): Promise<AuthenticationResponseJSON> {
  return startAuthentication({ optionsJSON });
}
