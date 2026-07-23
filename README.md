# Auto Present

Auto Present is a bilingual attendance-management Web/PWA foundation for Barguna Polytechnic
Institute's Department of Computer Science & Technology. Google Sheets remains the attendance
source of truth.

## Authentication setup

Copy each `.env.example`; provide a Google Web OAuth client and exact callback URIs. Generate
independent high-entropy JWT/IP-hash secrets and a 32-byte base64 Google-token encryption key.
`COOKIE_SECURE=false` is local HTTP only; production requires HTTPS. See
`docs/authentication.md` and `docs/session-security.md`.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- MongoDB for API readiness

## Setup

```bash
npm install
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env
npm run dev
```

Use `cp` instead of `copy` on macOS/Linux. Replace example values only in ignored `.env` files.

## Commands

| Command                | Purpose                             |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Run API and web development servers |
| `npm run dev:api`      | Run only the API                    |
| `npm run dev:web`      | Run only the web application        |
| `npm run build`        | Build every workspace               |
| `npm run typecheck`    | Check strict TypeScript             |
| `npm run lint`         | Run ESLint                          |
| `npm run format`       | Apply Prettier formatting           |
| `npm run format:check` | Check formatting                    |
| `npm run test`         | Run automated tests                 |
| `npm run verify`       | Run all quality gates               |

The API listens on `http://localhost:4000` and exposes:

- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`

## Repository layout

- `apps/api`: Express REST API foundation
- `apps/web`: React responsive web foundation
- `packages/shared`: platform-neutral contracts and domain constants
- `packages/config`: small cross-workspace defaults
- `assets/branding`: protected original branding assets
- `docs`: product and architecture decisions

Phase 1 intentionally excludes Google OAuth, Google API calls, Sheet parsing, attendance
submission, business-entity MongoDB models, deployment, and Tauri.
