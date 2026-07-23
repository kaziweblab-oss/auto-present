# Auto Present Product Requirements

## Purpose and users

Auto Present is a bilingual attendance-management application integrated with Google Sheets. It
starts as a responsive Web/PWA and preserves a path to Tauri 2 packages for Android, Windows, and
Linux.

Roles:

- **STUDENT:** authenticates with Google identity scopes only and later views personal attendance.
- **CAPTAIN:** supplies a Sheet URL and class roll, authorizes minimum required Sheet/Drive access,
  and later submits class attendance after backend verification.
- **ADMIN:** manages administrators, registered Sheets, and database configuration. The initial
  bootstrap email is provided by `INITIAL_ADMIN_EMAIL`. Backend authorization is mandatory.

The product must prevent removal of the final active super admin.

## Phase 1 outcomes

Phase 1 provides repository, API, web UI, localization, theming, health checks, test, and
documentation foundations. The UI clearly marks unavailable actions and contains no fake Google
login, dashboard data, or attendance flow.

## Product constraints

- Google Sheets is the attendance source of truth.
- Subject labels always use `Subject Name (Subject Code)`.
- External input must be validated.
- Spreadsheet identifiers, academic values, cells, rows, and columns must be dynamic.
- The web client never calls Google APIs directly.
- Original branding and reference images remain unchanged.

## Deferred capabilities

Google OAuth, token storage, Google Sheets/Drive calls, Sheet structure detection, notifications,
attendance submission, PWA installability, and Tauri applications are later-phase work.
