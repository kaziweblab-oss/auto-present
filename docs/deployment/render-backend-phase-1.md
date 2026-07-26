# Render Backend Deployment — Phase 4

## Root Directory

Leave at `/` (repository root).

## Build Command

```
npm ci && npm run build:api
```

- `npm ci` installs from `package-lock.json` (deterministic).
- `npm run build:api` builds shared → config → api in topological order.
- Compiled output for the API lands in `apps/api/dist/server.js`.
- The frontend (`apps/web`) is NOT built — deploy it separately (see Frontend Hosting below).

## Start Command

```
npm start
```

Equivalent to `npm run start --workspace @auto-present/api`, which runs `node dist/server.js` inside the `apps/api` directory.

## Node Version

- **`.node-version`**: `20` (committed to repo — Render auto-detects).
- **Fallback**: `engines.node >=20` in root `package.json`.

## Port

- **Environment variable:** `PORT` (Render injects this automatically).
- **Local default:** `4000` (via Zod `z.coerce.number().int().min(1).max(65_535).default(4000)`).
- **Host:** omitted → Node.js 20 binds to `::` (IPv6 dual-stack, includes `0.0.0.0`).
- **Validation:** rejects 0, negative, non-numeric, or out-of-range values.

## Health Endpoint

| Path                   | Method | Expected Response                                                                     |
| ---------------------- | ------ | ------------------------------------------------------------------------------------- |
| `/api/v1/health/live`  | GET    | `200 { success: true, data: { status: "ok", service: "auto-present-api", version } }` |
| `/api/v1/health/ready` | GET    | `200` if MongoDB connected, `503` if disconnected. Never leaks connection strings.    |

Configure Render health check to `/api/v1/health/live`.

## Graceful Shutdown

- **SIGTERM** (Render sends this): calls `shutdown()` → closes HTTP server → disconnects MongoDB → `process.exit(0)`.
- **SIGINT**: same handler.
- **Duplicate guard**: `isShuttingDown` flag prevents re-entry.
- **Timeout**: 10-second forced exit (`process.exit(1)`) if graceful shutdown hangs.
- **Failure**: if `closeServer` or `disconnectFromMongoDB` throws, logs the error and `process.exit(1)`.

## Process Error Handling

- `unhandledRejection`: logged with error message, then `process.exit(1)`. Single-execution guard.
- `uncaughtException`: logged with error message, then `process.exit(1)`. Single-execution guard.

## Trust Proxy

Set `TRUST_PROXY=true` on Render. This:

- Enables `app.set('trust proxy', 1)` for correct `req.ip` and rate-limiting behind Render's proxy.
- Required for `sameSite='none'` cookies to work correctly.

## Cookie Configuration

| Setting           | Same-origin deployment | Cross-origin deployment (different domains)        |
| ----------------- | ---------------------- | -------------------------------------------------- |
| `COOKIE_SECURE`   | `true`                 | `true`                                             |
| `COOKIE_SAMESITE` | `lax` (default)        | `none`                                             |
| `COOKIE_DOMAIN`   | (leave empty)          | `.(parent domain)` if sharing a registrable domain |

When frontend and API are on different registrable domains (e.g. `app.vercel.com` and `api.render.com`):

- **Must** set `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true`.
- Cookies will include `SameSite=None; Secure`, allowing cross-origin fetch requests.
- This is required for the refresh-token cookie (`ap_refresh`) to be sent on `POST /auth/refresh`.

When frontend and API share the same registrable domain (e.g. `app.example.com` and `api.example.com`):

- `COOKIE_SAMESITE=lax` (default) works correctly.
- Also set `COOKIE_DOMAIN=.example.com` so cookies are sent to both subdomains.

## Frontend Hosting (Render Static Site or any host)

### Build settings

- **Root Directory**: `apps/web`
- **Build Command**: `npm ci && npm run build`
- **Publish Directory**: `dist`
- **SPA Fallback**: Enable — all non-file routes rewrite to `index.html`.

### Required env vars (set at build time)

```
VITE_API_BASE_URL=https://your-api-domain.com/api/v1
VITE_LOGIN_HELP_VIDEO_URL=
```

Env vars prefixed with `VITE_` are embedded at **build time**. If you change the API URL, you must rebuild the frontend.

### Alternative: Custom domain with same-origin

Deploy the built `apps/web/dist` folder behind the same domain as the API (e.g. with nginx or Render's static site on a subpath) to avoid cross-origin cookie issues entirely.

## Environment Variable Checklist (Production)

### Required — must be set on Render

| Variable                        | Example                                                                                | Notes                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `NODE_ENV`                      | `production`                                                                           | Rejects default secrets                                                       |
| `MONGODB_URI`                   | `mongodb+srv://user:pass@cluster.mongodb.net/auto-present?retryWrites=true&w=majority` | Atlas SRV with TLS                                                            |
| `CORS_ALLOWED_ORIGINS`          | `https://app.example.com`                                                              | Comma-separated if multiple                                                   |
| `WEB_APP_URL`                   | `https://app.example.com`                                                              | Used for OAuth redirects                                                      |
| `GOOGLE_CLIENT_ID`              | (from Google Cloud Console)                                                            |                                                                               |
| `GOOGLE_CLIENT_SECRET`          | (from Google Cloud Console)                                                            |                                                                               |
| `GOOGLE_IDENTITY_REDIRECT_URI`  | `https://api.example.com/api/v1/auth/google/callback`                                  | Must match Google Cloud Console                                               |
| `GOOGLE_WORKSPACE_REDIRECT_URI` | `https://api.example.com/api/v1/auth/google/callback`                                  | Must match Google Cloud Console                                               |
| `JWT_ACCESS_SECRET`             | (64+ char random)                                                                      | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`    |
| `IP_HASH_SECRET`                | (32+ char random)                                                                      | `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`    |
| `GOOGLE_TOKEN_ENCRYPTION_KEY`   | (44-char base64)                                                                       | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `TRUST_PROXY`                   | `true`                                                                                 | Behind Render proxy                                                           |
| `COOKIE_SECURE`                 | `true`                                                                                 | HTTPS only                                                                    |

### Required — set on frontend build

| Variable            | Example                          | Notes                  |
| ------------------- | -------------------------------- | ---------------------- |
| `VITE_API_BASE_URL` | `https://api.example.com/api/v1` | Embedded at build time |

### Optional but recommended

| Variable              | Default             | Notes                                            |
| --------------------- | ------------------- | ------------------------------------------------ |
| `LOG_LEVEL`           | `info`              | Set to `warn` in production to reduce log volume |
| `COOKIE_DOMAIN`       | (unset)             | `.example.com` for shared-domain deployments     |
| `COOKIE_SAMESITE`     | `lax`               | Set to `none` for cross-origin deployments       |
| `ACCESS_TOKEN_TTL`    | `600`               | 10 minutes                                       |
| `REFRESH_TOKEN_TTL`   | `2592000`           | 30 days                                          |
| `INITIAL_ADMIN_EMAIL` | `admin@example.com` | First admin to bootstrap                         |

## Google Cloud Console OAuth Configuration

### Authorized JavaScript origins

```
https://app.example.com
```

### Authorized redirect URIs

```
https://api.example.com/api/v1/auth/google/callback
```

## MongoDB Atlas Connection

- Use `mongodb+srv://` SRV format with `retryWrites=true&w=majority`.
- Atlas TLS is automatic — no `tlsCAFile` required.
- `serverSelectionTimeoutMS=15000` (15 seconds) handles Atlas Serverless cold starts.
- If MongoDB is unavailable at startup, the server still starts and reports `not_ready` on the `/ready` endpoint.

## Production Smoke-Test Checklist

### API health

- [ ] `GET /api/v1/health/live` returns `200 { status: "ok" }`
- [ ] `GET /api/v1/health/ready` returns `200 { status: "ready" }` (or `503` if DB is down)
- [ ] Response includes the application `version` field

### CORS

- [ ] Request with allowed `Origin` returns `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials: true`
- [ ] Request with disallowed `Origin` returns `403` with `CORS_ORIGIN_DENIED`
- [ ] Preflight `OPTIONS` request returns `204`

### Authentication

- [ ] `GET /auth/bootstrap` returns `sessionPresent` and `googleClientId`
- [ ] `POST /auth/refresh` with valid refresh cookie returns new tokens
- [ ] `POST /auth/refresh` with invalid cookie returns `401 SESSION_EXPIRED`
- [ ] `POST /auth/logout` clears cookies and returns success
- [ ] `GET /auth/me` without bearer token returns `401 AUTHENTICATION_REQUIRED`
- [ ] `GET /auth/me` with valid token returns user profile

### Cookies

- [ ] `ap_refresh` cookie has `HttpOnly`, `Secure` (in production), `SameSite` matching `COOKIE_SAMESITE`
- [ ] `ap_csrf` cookie has `Secure` (in production), `SameSite` matching `COOKIE_SAMESITE` (NOT HttpOnly)

### Error handling

- [ ] Unknown route returns `404` with `ApiErrorResponse` shape
- [ ] Stack traces are NOT present in production error responses
- [ ] Error responses include `requestId` and `timestamp` in `meta`

### Frontend

- [ ] Frontend loads without console errors
- [ ] Login flow starts Google OAuth redirect
- [ ] OAuth callback redirects back to frontend with session set
- [ ] Logout clears session and returns to welcome page
- [ ] SPA fallback: navigating directly to any route serves the app

## Rollback Plan

1. **Revert deployment**: On Render, select the previous successful deploy and click "Rollback".
2. **Environment variables**: If a config change caused the issue, restore previous env vars before rolling back.
3. **Database**: If a migration or data issue occurs:
   - Atlas Point-in-Time Recovery if enabled.
   - Restore from latest snapshot.
4. **DNS**: If using a custom domain, keep the old IP/service running until the new deploy is verified.

## Failure Recovery

| Symptom                    | Likely Cause                    | Fix                                                         |
| -------------------------- | ------------------------------- | ----------------------------------------------------------- |
| Server crashes on startup  | Invalid env vars                | Check Render env vars match production checklist            |
| `CORS_ORIGIN_DENIED`       | `CORS_ALLOWED_ORIGINS` mismatch | Set to exact frontend URL (no trailing slash)               |
| OAuth callback fails       | Redirect URI mismatch           | Verify Google Cloud Console matches `GOOGLE_*_REDIRECT_URI` |
| Refresh token not sent     | Cross-origin cookie blocked     | Set `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true`           |
| MongoDB connection timeout | Atlas cold start or network     | Check `MONGODB_URI` and IP allowlist in Atlas               |

## Remaining Pre-Deployment Steps

1. Set all required env vars in Render dashboard.
2. Create Google OAuth credentials with production redirect URIs.
3. Configure MongoDB Atlas cluster and allow Render egress IPs (or disable IP allowlist with `0.0.0.0/0` — use VPC peering for production).
4. Deploy backend to Render.
5. Build and deploy frontend with production `VITE_API_BASE_URL`.
6. Run production smoke-test checklist.
7. Set up custom domain and TLS.
