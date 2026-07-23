# Cross-Platform Plan

## Direction

Auto Present ships as a responsive web application first. A later PWA phase adds a manifest,
service-worker strategy, installability, and Web Push. Tauri 2 may later package the same product
for Android, Windows, and Linux.

Tauri is intentionally absent from Phase 1.

## Compatibility boundaries

- Business and API contracts live in platform-neutral `packages/shared`.
- Google integration remains backend-only.
- Web UI uses responsive, accessible components and does not assume desktop-only input.
- Runtime configuration is environment-driven.
- Native capabilities will be introduced behind narrow adapters instead of leaking Tauri APIs
  through application components.

Authentication redirects, secure cookie behavior, deep links, update signing, native notification
permissions, and platform storage require explicit threat modeling before native packaging.

## Planned releases

1. Harden responsive web foundation.
2. Add installable PWA and offline-safe shell (never stale attendance writes).
3. Validate backend authentication flows in packaged environments.
4. Add Tauri 2 packages per platform with signing and update infrastructure.
