export interface GoogleCredentialResponse {
  credential?: string;
  select_by?: string;
}

export interface GoogleButtonConfiguration {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  use_fedcm_for_button?: boolean;
}

interface GoogleAccountsIdApi {
  initialize: (configuration: GoogleIdConfiguration) => void;
  renderButton: (
    parent: HTMLElement,
    options: GoogleButtonConfiguration,
  ) => void;
  disableAutoSelect: () => void;
}

interface GoogleIdentityServicesApi {
  accounts: {
    id: GoogleAccountsIdApi;
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServicesApi;
  }
}

const GOOGLE_SCRIPT_ID = "filmgeezer-google-identity-services";
const GOOGLE_SCRIPT_URL = "https://accounts.google.com/gsi/client";

let scriptPromise: Promise<GoogleIdentityServicesApi> | null = null;
let initializedClientId: string | null = null;
let activeCredentialHandler:
  | ((credential: string) => void)
  | null = null;

function getGoogleApi(): GoogleIdentityServicesApi | null {
  return window.google ?? null;
}

export function getGoogleClientId(): string | null {
  const clientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

  return clientId ? clientId : null;
}

export function loadGoogleIdentityServices(): Promise<GoogleIdentityServicesApi> {
  const existingApi = getGoogleApi();

  if (existingApi) {
    return Promise.resolve(existingApi);
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const finish = () => {
      const api = getGoogleApi();

      if (!api) {
        scriptPromise = null;
        reject(
          new Error(
            "Google sign in could not be loaded.",
          ),
        );
        return;
      }

      resolve(api);
    };

    const existingScript = document.getElementById(
      GOOGLE_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", finish, {
        once: true,
      });
      existingScript.addEventListener(
        "error",
        () => {
          scriptPromise = null;
          reject(
            new Error(
              "Google sign in could not be loaded.",
            ),
          );
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.referrerPolicy = "strict-origin-when-cross-origin";
    script.addEventListener("load", finish, { once: true });
    script.addEventListener(
      "error",
      () => {
        scriptPromise = null;
        reject(
          new Error(
            "Google sign in could not be loaded.",
          ),
        );
      },
      { once: true },
    );

    document.head.append(script);
  });

  return scriptPromise;
}

export async function initializeGoogleIdentityServices(
  clientId: string,
): Promise<GoogleIdentityServicesApi> {
  const api = await loadGoogleIdentityServices();

  if (initializedClientId !== clientId) {
    api.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        const credential = response.credential?.trim();

        if (credential) {
          activeCredentialHandler?.(credential);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_button: true,
    });

    initializedClientId = clientId;
  }

  return api;
}

export function setActiveGoogleCredentialHandler(
  handler: (credential: string) => void,
): () => void {
  activeCredentialHandler = handler;

  return () => {
    if (activeCredentialHandler === handler) {
      activeCredentialHandler = null;
    }
  };
}
