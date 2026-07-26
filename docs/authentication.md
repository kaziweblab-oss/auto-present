# Authentication

The API uses a backend-owned Google OAuth 2.0 authorization-code flow. Role selection is intent,
not authorization. Google `sub` is the immutable identity key and email must be verified.

Identity requests only `openid email profile`. The backend creates a ten-minute, single-use,
hashed-state transaction bound to role intent, flow, safe relative return path, PKCE, and a browser
cookie. Google tokens never enter frontend URLs. Student and Captain remain pending until later
verification. Admin requires an active `AdminMembership`.

Workspace consent is a separate authenticated incremental flow using `spreadsheets` and
`drive.file`.

## Session and Google connection actions

- **Logout** ends only the current Auto Present session. It does not remove stored Workspace
  authorization or sign the user out of Google.
- **Logout all devices** ends every Auto Present session for the user. It does not remove the
  stored Google credential.
- **Disconnect Google** first uses the current official Google Identity Services `revoke` API to
  remove Auto Present identity-sharing consent. It then revokes/removes stored Workspace
  authorization when present, ends every Auto Present session, and requires authorization again
  before future login or Sheet operations. Identity-only users can use this action too.

Identity revocation and backend cleanup are an explicit two-stage operation. If browser GIS
revocation is unavailable, the UI does not claim completion and links to Google Account
permissions. If identity revocation succeeds but backend cleanup is temporarily unavailable, the
UI reports partial completion and retries only the backend stage; it does not attempt to restore or
revoke identity consent twice.

Google may reuse a permission already granted without showing the consent screen again. Users can
also manage Auto Present grants from their Google Account security settings. Auto Present cannot
and does not sign users out of their global Google account.

## Google Cloud setup

Create a Web OAuth client, configure the consent screen, and register the exact identity and
workspace redirect URIs. Configure client ID/secret and both redirect URI environment variables.
Live OAuth cannot work with the local placeholders.
