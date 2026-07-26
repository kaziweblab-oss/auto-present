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

## Current implementation status

This repository corresponds to the Captain MVP phase. See the root README for the feature status
table. Future capabilities (notifications, PWA, Tauri) are documented in the plan docs under
`docs/`.

## Product constraints

- Google Sheets is the attendance source of truth.
- Subject labels always use `Subject Name (Subject Code)`.
- External input must be validated.
- Spreadsheet identifiers, academic values, cells, rows, and columns must be dynamic.
- The web client never calls Google APIs directly.
- Original branding and reference images remain unchanged.

## Planned capabilities

Notifications, PWA installability, and Tauri applications are documented in their respective plan
documents under `docs/` and are not yet implemented.
