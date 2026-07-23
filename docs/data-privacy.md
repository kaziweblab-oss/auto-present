# Data Privacy and Minimization

Google Sheets remains the source of truth for attendance. MongoDB must not duplicate complete
student Sheet rows or full attendance history.

## Permitted student mapping

Future student records may contain only the identity and academic mapping required to locate Sheet
data:

- Google user ID and email
- role, roll, department reference, semester, and shift
- registered Sheet reference
- active status and verification timestamps

## Permitted comparison state

Future change detection may retain only:

- user and subject references
- last attendance fingerprint/hash
- last total present and absent
- last checked timestamp

This state supports notification comparison without creating a second attendance database.

## Credentials and telemetry

Application tokens and Google tokens are separate. Google refresh tokens must be encrypted at rest.
Authorization codes, tokens, cookies, passwords, API keys, MongoDB URIs, and secrets must never be
logged. Public errors and health responses must not reveal infrastructure details.

No business MongoDB models are implemented in Phase 1.
