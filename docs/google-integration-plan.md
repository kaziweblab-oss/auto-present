# Google Integration Plan

Phase 2 implements separate identity and incremental Workspace OAuth foundations. Identity uses
`openid`, `email`, and `profile`. Workspace uses `spreadsheets` and `drive.file`, stores normalized
grants, and stores refresh credentials with AES-256-GCM ciphertext, IV, authentication tag, and key
version. An existing refresh token is preserved when Google omits a new one.

No Sheets/Drive business API, Sheet verification, parsing, or attendance operation is included.

## Consent by role

- **Student:** request only `openid`, `email`, and `profile`; never request Sheets or Drive access.
- **Captain:** request Google identity plus the minimum Sheet/Drive authorization needed for a
  user-selected registered Spreadsheet. The backend verifies actual edit capability. The captain
  supplies the Sheet URL and class roll, and the roll must exist in the Sheet.
- **Admin:** application authorization controls administrative access. Bootstrap uses
  `INITIAL_ADMIN_EMAIL=kazitasinhossen@gmail.com`.

The frontend sends authorization results to the backend but never communicates directly with
Sheets or Drive.

## Token lifecycle

Application authentication uses short-lived JWT access tokens and rotating application refresh
tokens in secure HTTP-only cookies. Google tokens are stored separately; Google refresh tokens are
encrypted at rest. Backend services silently refresh access tokens.

If refresh is permanently revoked or invalid, the backend revokes the application session, creates
a notification, and requires a new login. Token reuse detection and session-family revocation must
be part of the authentication implementation.

## Security rules

Use state and PKCE where applicable, validate redirect targets, request incremental scopes, and
never log tokens, authorization codes, cookies, or secrets. Registered Spreadsheet access is
verified server-side rather than trusted from UI input.
