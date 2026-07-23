# Architecture

## Repository

Auto Present uses npm workspaces and strict TypeScript:

```text
apps/web -> REST API -> apps/api -> MongoDB / future Google integrations
              |
              +--- packages/shared contracts
```

`packages/config` contains only genuinely reused defaults. `packages/shared` remains free of
browser-only and backend-only dependencies.

Authentication follows route/middleware -> service -> repository -> Mongoose model. OAuth
transactions, application sessions, and Google credentials are independent. Frontend role intent
cannot grant authorization; access tokens remain in memory and refresh tokens remain cookie-only.

## Backend boundaries

Every business endpoint follows:

```text
Route -> Validation Middleware -> Authentication/Authorization Middleware
      -> Controller -> Service -> Repository -> Mongoose Model
```

Controllers translate HTTP concerns, services own business rules, repositories own persistence,
and future Google communication stays in isolated integration services. Dependencies should point
inward and avoid circular imports.

Phase 1 health endpoints use route, controller, and service boundaries. They do not need a
repository because liveness and Mongoose connection state are operational state, not persisted
business entities.

## API contracts and errors

Responses use stable success/error envelopes from `@auto-present/shared` and carry a request ID and
timestamp. Central middleware handles not-found and unexpected errors. Production responses never
include stack traces. Logs redact credential-bearing fields.

## Health strategy

- `GET /api/v1/health/live` proves the Node process can answer requests.
- `GET /api/v1/health/ready` returns HTTP 200 only when MongoDB is connected, otherwise HTTP 503.
- Public responses expose only a stable connected/disconnected state, never URIs or detailed
  dependency errors.
- Future detailed dependency diagnostics will require admin authorization.

## Cross-cutting security

Helmet, explicit CORS allowlisting, small payload limits, cookies, request IDs, and API rate limits
are configured centrally. Environment values are parsed with Zod at startup.
