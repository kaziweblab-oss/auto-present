# Notification Plan

Notifications are documented but not implemented in Phase 1.

## Event types

- new Present
- new Absent
- attendance correction
- Google connection expired
- Sheet sync failed
- permission removed
- system announcement

## Delivery channels

The first channel will be an in-app inbox, followed by Web Push/PWA notifications and future Tauri
native notifications. Users will control supported notification preferences.

## Change detection

Google Sheets does not deliver every cell-level attendance change directly to this application.
External edits therefore require scheduled or change-triggered synchronization. The backend will
compare minimal fingerprints and present/absent totals rather than retain full attendance history.
Notifications must be idempotent to avoid duplicates after retries.

Token refresh revocation, permission loss, and sync failures produce actionable security/operations
notifications without including secrets or sensitive Sheet contents.
