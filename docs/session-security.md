# Session security

The API issues a ten-minute signed JWT with minimal claims and a signing-key `kid`. The SPA keeps
it only in memory. The thirty-day refresh token is random and opaque; MongoDB stores only SHA-256.
Refresh atomically replaces the active hash. Reuse of a consumed hash revokes the complete family
and creates an audit event.

The refresh cookie is HTTP-only, SameSite=Lax, auth-path limited, and Secure in production.
Cookie-authenticated mutations require an allowlisted Origin/Referer and double-submit CSRF
header. Production requires HTTPS, exact CORS origins, and rotated high-entropy secrets.

## Integration-test database

Run `npm run test:integration` only with a MongoDB service on
`mongodb://127.0.0.1:27017/auto-present_test`. The suite requires `NODE_ENV=test`, accepts only
`127.0.0.1` or `localhost`, requires an `_test` database suffix, explicitly rejects
`auto-present`, and cleans only its named test collections. CI should provision an isolated
MongoDB service with the same dedicated database contract; it must never point the test command at
a development or production URI.
