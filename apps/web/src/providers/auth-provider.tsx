/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, react-refresh/only-export-components -- API envelopes are checked by the backend shared contract; hook colocates with its provider. */
import type {
  AuthBootstrapResponse,
  AuthTokensResponse,
  AuthUser,
  GoogleConnectionView,
  UserRole,
} from '@auto-present/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { apiClient, setAccessToken, setCsrfToken } from '@/lib/api';
import { revokeGoogleIdentityConsent } from '@/lib/google-identity-services';

type AuthStatus = 'loading' | 'anonymous' | 'authenticated';
interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  errorCode: string | null;
  isLoggingOut: boolean;
  logoutErrorCode: string | null;
  googleConnection: GoogleConnectionView | null;
  isDisconnectingGoogle: boolean;
  disconnectGoogleErrorCode: string | null;
  pendingRoles: UserRole[];
  startSignIn(role: UserRole): Promise<void>;
  refresh(): Promise<void>;
  logout(): Promise<boolean>;
  disconnectGoogle(): Promise<boolean>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
let bootstrapPromise: Promise<{
  accessToken: string;
  user: AuthUser;
  googleClientId: string;
} | null> | null = null;
let anonymousBootstrapPromise: Promise<void> | null = null;
let publicGoogleClientId: string | null = null;

function bootstrapSession(): Promise<{
  accessToken: string;
  user: AuthUser;
  googleClientId: string;
} | null> {
  bootstrapPromise ??= apiClient
    .get<{ success: true; data: AuthBootstrapResponse }>('/auth/bootstrap')
    .then(async (response) => {
      publicGoogleClientId = response.data.data.googleClientId;
      if (!response.data.data.sessionPresent) return null;
      const refreshed = await apiClient.post<{ success: true; data: AuthTokensResponse }>(
        '/auth/refresh',
      );
      return { ...refreshed.data.data, googleClientId: response.data.data.googleClientId };
    });
  return bootstrapPromise;
}

async function bootstrapAnonymousCsrf(): Promise<void> {
  anonymousBootstrapPromise ??= apiClient
    .get<{ success: true; data: AuthBootstrapResponse }>('/auth/bootstrap')
    .then((response) => {
      publicGoogleClientId = response.data.data.googleClientId;
      if (response.data.data.sessionPresent)
        throw new Error('Logout did not clear the application session');
    })
    .finally(() => {
      anonymousBootstrapPromise = null;
    });
  return anonymousBootstrapPromise;
}

export function resetAuthBootstrapForTests(): void {
  bootstrapPromise = null;
  anonymousBootstrapPromise = null;
  publicGoogleClientId = null;
}

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutErrorCode, setLogoutErrorCode] = useState<string | null>(null);
  const [googleConnection, setGoogleConnection] = useState<GoogleConnectionView | null>(null);
  const [isDisconnectingGoogle, setIsDisconnectingGoogle] = useState(false);
  const [disconnectGoogleErrorCode, setDisconnectGoogleErrorCode] = useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = useState<UserRole[]>([]);
  const pendingRolesRef = useRef(new Set<UserRole>());
  const logoutPromise = useRef<Promise<boolean> | null>(null);
  const disconnectPromise = useRef<Promise<boolean> | null>(null);
  const identityConsentRevoked = useRef(false);
  const identityUserId = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const session = await bootstrapSession();
      if (session) {
        setAccessToken(session.accessToken);
        setUser(session.user);
        setStatus('authenticated');
      } else {
        setAccessToken(null);
        setUser(null);
        setStatus('anonymous');
      }
    } catch {
      setAccessToken(null);
      setUser(null);
      setStatus('anonymous');
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (status !== 'authenticated') {
      setGoogleConnection(null);
      return;
    }
    let active = true;
    void apiClient
      .get<{ success: true; data: GoogleConnectionView }>('/auth/google/connection')
      .then((response) => {
        if (active) setGoogleConnection(response.data.data);
      })
      .catch(() => {
        if (active) setGoogleConnection(null);
      });
    return () => {
      active = false;
    };
  }, [status]);
  useEffect(() => {
    if (user && identityUserId.current !== user.id) {
      identityUserId.current = user.id;
      identityConsentRevoked.current = false;
    }
  }, [user]);
  const startSignIn = useCallback(async (role: UserRole) => {
    if (pendingRolesRef.current.has(role)) return;
    pendingRolesRef.current.add(role);
    setErrorCode(null);
    setPendingRoles((current) => [...current, role]);
    try {
      const response = await apiClient.post('/auth/google/start', {
        role,
        returnPath: '/auth/result',
      });
      window.location.assign(response.data.data.authorizationUrl);
    } catch {
      setErrorCode('AUTH_START_FAILED');
      pendingRolesRef.current.delete(role);
      setPendingRoles((current) => current.filter((pending) => pending !== role));
    }
  }, []);
  const logout = useCallback(() => {
    if (logoutPromise.current) return logoutPromise.current;
    setIsLoggingOut(true);
    setLogoutErrorCode(null);
    const request = (async () => {
      try {
        await apiClient.post('/auth/logout');
      } catch {
        setLogoutErrorCode('LOGOUT_FAILED');
        return false;
      }

      bootstrapPromise = null;
      setAccessToken(null);
      setCsrfToken(null);
      setUser(null);
      setErrorCode(null);
      identityConsentRevoked.current = false;
      identityUserId.current = null;
      pendingRolesRef.current.clear();
      setPendingRoles([]);
      setStatus('loading');
      void bootstrapAnonymousCsrf()
        .then(() => {
          bootstrapPromise = null;
          setStatus('anonymous');
        })
        .catch(() => {
          bootstrapPromise = null;
        });
      return true;
    })().finally(() => {
      setIsLoggingOut(false);
      logoutPromise.current = null;
    });
    logoutPromise.current = request;
    return request;
  }, []);
  const disconnectGoogle = useCallback(() => {
    if (disconnectPromise.current) return disconnectPromise.current;
    setIsDisconnectingGoogle(true);
    setDisconnectGoogleErrorCode(null);
    const request = (async () => {
      if (!user) {
        setDisconnectGoogleErrorCode('GOOGLE_IDENTITY_REVOKE_UNAVAILABLE');
        return false;
      }
      if (!identityConsentRevoked.current) {
        const identityRevoked = await revokeGoogleIdentityConsent(user.email, publicGoogleClientId);
        if (!identityRevoked) {
          setDisconnectGoogleErrorCode('GOOGLE_IDENTITY_REVOKE_UNAVAILABLE');
          return false;
        }
        identityConsentRevoked.current = true;
      }
      try {
        await apiClient.post('/auth/google/disconnect');
      } catch {
        setDisconnectGoogleErrorCode('GOOGLE_DISCONNECT_PARTIAL');
        return false;
      }
      bootstrapPromise = null;
      setAccessToken(null);
      setCsrfToken(null);
      setUser(null);
      setErrorCode(null);
      setGoogleConnection(null);
      pendingRolesRef.current.clear();
      setPendingRoles([]);
      setStatus('loading');
      identityConsentRevoked.current = false;
      identityUserId.current = null;
      void bootstrapAnonymousCsrf()
        .then(() => {
          bootstrapPromise = null;
          setStatus('anonymous');
        })
        .catch(() => {
          bootstrapPromise = null;
        });
      return true;
    })().finally(() => {
      setIsDisconnectingGoogle(false);
      disconnectPromise.current = null;
    });
    disconnectPromise.current = request;
    return request;
  }, [user]);
  const value = useMemo(
    () => ({
      status,
      user,
      errorCode,
      isLoggingOut,
      logoutErrorCode,
      googleConnection,
      isDisconnectingGoogle,
      disconnectGoogleErrorCode,
      pendingRoles,
      startSignIn,
      refresh,
      logout,
      disconnectGoogle,
    }),
    [
      status,
      user,
      errorCode,
      isLoggingOut,
      logoutErrorCode,
      googleConnection,
      isDisconnectingGoogle,
      disconnectGoogleErrorCode,
      pendingRoles,
      startSignIn,
      refresh,
      logout,
      disconnectGoogle,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
