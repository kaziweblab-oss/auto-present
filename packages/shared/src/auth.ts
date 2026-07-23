import type { UserRole } from './constants.js';

export type AuthFlow = 'IDENTITY' | 'WORKSPACE';
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  roles: UserRole[];
  requestedRole?: UserRole;
}
export interface AuthTokensResponse {
  accessToken: string;
  csrfToken: string;
  user: AuthUser;
}
export interface AuthSessionView {
  id: string;
  current: boolean;
  userAgent: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
}
export interface GoogleAuthStartResponse {
  authorizationUrl: string;
}
export interface AuthBootstrapResponse {
  sessionPresent: boolean;
  csrfToken: string;
  googleClientId: string;
}
export interface GoogleConnectionView {
  status: 'NOT_CONNECTED' | 'CONNECTED' | 'RECONNECT_REQUIRED';
  scopes: string[];
}
export interface GoogleDisconnectResponse {
  status: 'DISCONNECTED' | 'ALREADY_DISCONNECTED';
}
