export const GOOGLE_IDENTITY_SERVICES_ORIGIN = 'https://accounts.google.com';
const GIS_SCRIPT_URL = `${GOOGLE_IDENTITY_SERVICES_ORIGIN}/gsi/client`;
const GIS_TIMEOUT_MS = 10_000;

interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

interface GoogleIdentityConfiguration {
  client_id: string;
  callback(response: GoogleCredentialResponse): void;
  auto_select: false;
}

interface GoogleRevocationResponse {
  successful: boolean;
}

interface GoogleIdentityApi {
  initialize(configuration: GoogleIdentityConfiguration): void;
  revoke(hint: string, callback: (response: GoogleRevocationResponse) => void): void;
  prompt?(callback?: (notification: unknown) => void): void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleIdentityApi;
      };
    };
  }
}

let scriptPromise: Promise<GoogleIdentityApi> | null = null;
let initializationPromise: Promise<GoogleIdentityApi> | null = null;
let initializedClientId: string | null = null;
let revokePromise: Promise<boolean> | null = null;

function withTimeout<T>(operation: Promise<T>, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(message));
    }, GIS_TIMEOUT_MS);
    operation.then(
      (value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        reject(error instanceof Error ? error : new Error('Google Identity Services failed'));
      },
    );
  });
}

function getGoogleIdentityApi(): GoogleIdentityApi | null {
  const api = window.google?.accounts?.id;
  return api && typeof api.initialize === 'function' && typeof api.revoke === 'function'
    ? api
    : null;
}

function loadGoogleIdentityServices(): Promise<GoogleIdentityApi> {
  const loadedApi = getGoogleIdentityApi();
  if (loadedApi) return Promise.resolve(loadedApi);

  scriptPromise ??= withTimeout(
    new Promise<GoogleIdentityApi>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT_URL}"]`);
      const script = existing ?? document.createElement('script');
      const cleanup = (): void => {
        script.removeEventListener('load', onLoad);
        script.removeEventListener('error', onError);
      };
      const fail = (message: string): void => {
        cleanup();
        if (!existing) script.remove();
        reject(new Error(message));
      };
      const onLoad = (): void => {
        const api = getGoogleIdentityApi();
        if (api) {
          cleanup();
          resolve(api);
        } else {
          fail('Google Identity Services is unavailable');
        }
      };
      const onError = (): void => {
        fail('Google Identity Services could not be loaded');
      };

      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });
      if (!existing) {
        script.src = GIS_SCRIPT_URL;
        script.async = true;
        script.defer = true;
        script.referrerPolicy = 'no-referrer';
        document.head.append(script);
      }
    }),
    'Google Identity Services loading timed out',
  ).catch((error: unknown) => {
    scriptPromise = null;
    throw error;
  });
  return scriptPromise;
}

function initializeGoogleIdentityServices(clientId: string): Promise<GoogleIdentityApi> {
  const normalizedClientId = clientId.trim();
  if (!normalizedClientId) return Promise.reject(new Error('Google client ID is unavailable'));
  if (initializedClientId === normalizedClientId) return loadGoogleIdentityServices();
  if (initializedClientId && initializedClientId !== normalizedClientId)
    return Promise.reject(new Error('Google Identity Services is already configured'));

  initializationPromise ??= withTimeout(
    loadGoogleIdentityServices().then((api) => {
      api.initialize({
        client_id: normalizedClientId,
        callback: () => {
          // Disconnect never accepts GIS credentials or creates an application session.
        },
        auto_select: false,
      });
      initializedClientId = normalizedClientId;
      return api;
    }),
    'Google Identity Services initialization timed out',
  ).catch((error: unknown) => {
    initializationPromise = null;
    throw error;
  });
  return initializationPromise;
}

export function revokeGoogleIdentityConsent(
  verifiedEmail: string,
  googleClientId: string | null,
): Promise<boolean> {
  if (revokePromise) return revokePromise;
  revokePromise = (async () => {
    try {
      if (!googleClientId) return false;
      const api = await initializeGoogleIdentityServices(googleClientId);
      return await withTimeout(
        new Promise<boolean>((resolve) => {
          let settled = false;
          api.revoke(verifiedEmail, (response) => {
            if (settled) return;
            settled = true;
            resolve(response.successful === true);
          });
        }),
        'Google identity revocation timed out',
      );
    } catch {
      return false;
    }
  })().finally(() => {
    revokePromise = null;
  });
  return revokePromise;
}

export function resetGoogleIdentityServicesForTests(): void {
  scriptPromise = null;
  initializationPromise = null;
  initializedClientId = null;
  revokePromise = null;
}
