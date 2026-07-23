# Legal and Google Verification Review Checklist

The public privacy and terms pages are accurate implementation drafts, not legal advice. Complete
this checklist before production publication or Google OAuth verification.

## Ownership and contact

- Confirm the legal/service operator name and institutional relationship.
- Configure an official, monitored `VITE_SUPPORT_EMAIL`.
- Confirm the person or team authorized to respond to privacy and account-removal requests.
- Add an effective date and a documented policy-change process if required by counsel.

## Privacy review

- Verify every collected field against the implemented database models and logs.
- Confirm that students never grant Google Sheets or Drive scopes.
- Confirm the exact minimum captain scopes against the final Google integration.
- Document actual token encryption, retention, rotation, and deletion behavior.
- Verify account/session deletion behavior and expected response times.
- Identify all production subprocessors and update the sharing section.
- Re-check whether analytics, telemetry, crash reporting, or advertising has been introduced.
- Obtain legal and institutional approval for applicable jurisdictional requirements.

## Terms review

- Confirm eligibility, authorized educational use, and role responsibilities.
- Confirm Sheet ownership, permission, correction, and dispute processes.
- Define suspension, termination, appeal, service availability, and policy-change procedures.
- Review warranty, liability, governing-law, and dispute language with qualified counsel before
  adding any such clauses.

## Google verification readiness

- Host `/privacy`, `/terms`, `/support`, and `/help/google-permissions` on the verified production
  domain.
- Ensure the OAuth consent-screen app name and logo use the approved Auto Present identity based on
  `app-icon.png`.
- Confirm domain ownership, homepage links, support email, redirect URIs, and authorized domains.
- Ensure public pages work without login in English and Bangla.
- Record a verification video demonstrating why each requested Google scope is necessary.
- Confirm the production UI and public policy match actual Google API data use.
- Re-run accessibility, mobile, security, and broken-link checks after deployment configuration.
