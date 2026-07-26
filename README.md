# Auto Present

Bilingual attendance-management application for Barguna Polytechnic Institute's Department of
Computer Science & Technology. Google Sheets remains the source of truth; the database stores
only metadata, session state, and encrypted credentials.

## Feature status

| Feature                    | Status      |
| -------------------------- | ----------- |
| Google OAuth login         | Implemented |
| Auth sessions & refresh    | Implemented |
| Role selection (intent)    | Implemented |
| Admin bootstrapping        | Implemented |
| Captain Sheet registration | Implemented |
| Sheet structure parser     | Implemented |
| Attendance marking         | Implemented |
| Attendance history         | Implemented |
| Student roll verification  | Implemented |
| Role switching (sidebar)   | Implemented |
| Bilingual (EN/BN)          | Implemented |
| Dark/light theme           | Implemented |
| Health endpoints           | Implemented |
| Audit events               | Implemented |
| Notifications              | Planned     |
| PWA / offline shell        | Planned     |
| Tauri native packages      | Planned     |

## Roles

- **STUDENT** — authenticates with Google identity only; views personal attendance after roll
  verification against the Captain's Sheet.
- **CAPTAIN** — registers a Google Sheet URL and class roll; the backend verifies Sheet structure
  and later writes attendance marks submitted through the UI.
- **ADMIN** — manages administrators and database configuration. The initial admin is seeded via
  `INITIAL_ADMIN_EMAIL`. Backend authorization is mandatory.

## Technology stack

| Layer    | Technology                                                 |
| -------- | ---------------------------------------------------------- |
| Frontend | React 19, Vite 7, TypeScript 5.9, Tailwind CSS 4, Radix UI |
| API      | Express 5, Mongoose 8, Zod 4, jose, Winston                |
| Database | MongoDB (local / Atlas)                                    |
| Auth     | Google OAuth 2.0 (backend-owned), JWT, HTTP-only cookies   |
| Monorepo | npm workspaces                                             |
| Lint/Fmt | ESLint, Prettier                                           |
| Test     | Vitest, Supertest, Testing Library                         |

## Folder structure

```
auto-present/
├── apps/
│   ├── api/                        # Express REST API
│   │   ├── src/
│   │   │   ├── config/             # Zod-enforced env parsing
│   │   │   ├── errors/             # AppError and error handler
│   │   │   ├── middleware/         # Request ID, not-found, error handler
│   │   │   ├── modules/
│   │   │   │   ├── auth/           # OAuth, sessions, JWT, CSRF
│   │   │   │   ├── captain/        # Sheet registration, attendance
│   │   │   │   ├── student/        # Roll verification, dashboard
│   │   │   │   └── health/         # Liveness / readiness
│   │   │   └── server.ts           # Entry point
│   │   └── .env.example
│   └── web/                        # React SPA
│       ├── src/
│       │   ├── components/         # Shared UI components
│       │   ├── pages/              # Route-level page components
│       │   ├── providers/          # Auth, theme, API providers
│       │   ├── lib/                # API client, storage, helpers
│       │   └── i18n.ts             # i18next configuration
│       └── .env.example
├── packages/
│   ├── shared/                     # Platform-neutral contracts & constants
│   └── config/                     # Cross-workspace defaults
├── docs/                           # Architecture, security, deployment
├── assets/branding/                # Protected original branding
└── .env.example                    # Root env template (see apps/api/.env.example)
```

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- MongoDB (local or Atlas)

## Local installation

```bash
# 1. Clone and install
git clone <repo-url>
cd auto-present
npm install

# 2. Configure environment variables
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env
# Replace example values with your own (see Environment Variables below).
# Use `cp` instead of `copy` on macOS/Linux.

# 3. Start MongoDB locally (example with Docker)
docker run -d -p 27017:27017 mongo:7

# 4. Start development servers
npm run dev
```

## Environment variables

**Never commit real `.env` files or credentials.** The repository ignores all `.env` files via
`.gitignore`. Only `.env.example` templates are tracked.

Each app has its own `.env.example`:

- `apps/api/.env.example` — API runtime configuration
- `apps/web/.env.example` — Frontend build-time configuration (`VITE_`-prefixed)

Key variables you must set for local development:

| Variable                      | Local value                              | Production                    |
| ----------------------------- | ---------------------------------------- | ----------------------------- |
| `GOOGLE_CLIENT_ID`            | (from Google Cloud Console)              | Same, production OAuth client |
| `GOOGLE_CLIENT_SECRET`        | (from Google Cloud Console)              | Same, production OAuth client |
| `JWT_ACCESS_SECRET`           | (64+ char random)                        | Different high-entropy secret |
| `IP_HASH_SECRET`              | (32+ char random)                        | Different high-entropy secret |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | (44-char base64)                         | Different key for production  |
| `MONGODB_URI`                 | `mongodb://127.0.0.1:27017/auto-present` | Atlas SRV string              |
| `COOKIE_SECURE`               | `false`                                  | `true`                        |

See `docs/authentication.md` and `docs/session-security.md` for OAuth and cookie details.

## Development commands

| Command                    | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `npm run dev`              | Run API and web dev servers                    |
| `npm run dev:api`          | Run only the API                               |
| `npm run dev:web`          | Run only the web application                   |
| `npm run build`            | Build every workspace                          |
| `npm run typecheck`        | Strict TypeScript checking                     |
| `npm run lint`             | ESLint                                         |
| `npm run format`           | Apply Prettier formatting                      |
| `npm run format:check`     | Check formatting                               |
| `npm run test`             | Run all tests (workspaces)                     |
| `npm run test:unit`        | Run all unit tests                             |
| `npm run test:api`         | API unit + ESM import smoke test               |
| `npm run test:web`         | Web unit tests                                 |
| `npm run test:integration` | API integration tests (requires MongoDB)       |
| `npm run verify`           | Format check + lint + typecheck + test + build |

## Local URLs

| Service  | URL                     |
| -------- | ----------------------- |
| Frontend | `http://localhost:5173` |
| API      | `http://localhost:4000` |

## Health endpoints

| Path                   | Method | Description                                              |
| ---------------------- | ------ | -------------------------------------------------------- |
| `/api/v1/health/live`  | GET    | Returns `200` when the process is running                |
| `/api/v1/health/ready` | GET    | Returns `200` when MongoDB is connected, `503` otherwise |

## Database

**Local development:** Use `mongodb://127.0.0.1:27017/auto-present` (default).

**Production:** Use MongoDB Atlas with an SRV connection string:

```
mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/auto-present?retryWrites=true&w=majority
```

Atlas TLS is automatic. The server starts even if the database is unreachable (reports as
`not_ready` on the `/ready` endpoint).

## Google OAuth

See `docs/authentication.md` for the full OAuth flow.

1. Create a **Web OAuth client** in Google Cloud Console.
2. Add the authorized redirect URI: `http://localhost:4000/api/v1/auth/google/callback`
   (replace with your production URI).
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your `.env` file.
4. Identity scope: `openid email profile`.
5. Workspace scope: `spreadsheets` and `drive.file` (Captain only).

Live OAuth cannot work with the local placeholder values.

## Render deployment

See `docs/deployment/render-backend-phase-1.md` for the complete deployment guide.

**Quick summary:**

- Build command: `npm ci && npm run build:api`
- Start command: `npm start`
- Set `TRUST_PROXY=true` behind Render's proxy
- Deploy the frontend separately from `apps/web` with its own build
- Configure all required env vars in the Render dashboard (see deployment doc for checklist)

## Production safety

- Real `.env` files and credentials must **never** be committed.
- Google OAuth tokens are encrypted at rest with AES-256-GCM.
- Refresh tokens are stored as SHA-256 hashes; the originals are never persisted.
- Stack traces are hidden from production error responses.
- CORS is strictly allowlisted; unknown origins receive `403`.
- Rate limiting is applied globally and per-route.
- Helmet security headers are enabled.
- Student attendance data is **not persistently stored** in the database. Google Sheets is the
  source of truth. The database stores only the metadata mapping (user → roll → Sheet reference)
  needed to locate and display attendance from the Sheet.

## Troubleshooting

| Problem                             | Likely cause                | Fix                                                  |
| ----------------------------------- | --------------------------- | ---------------------------------------------------- |
| `CORS_ORIGIN_DENIED`                | Origin not in allowlist     | Check `CORS_ALLOWED_ORIGINS`                         |
| `Invalid environment configuration` | Missing or invalid env var  | Run with `NODE_ENV=development` for relaxed defaults |
| OAuth callback fails                | Redirect URI mismatch       | Verify `GOOGLE_*_REDIRECT_URI` matches Cloud Console |
| MongoDB connection error            | MongoDB not running         | Start `mongod` or Docker container                   |
| Tests fail                          | MongoDB not running         | Some tests require a local MongoDB instance          |
| `ap_refresh` cookie not sent        | Cross-origin cookie blocked | Set `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true`    |

## Status

Project version `0.1.0`. Pre-production — not yet deployed.
