# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Added
- Phase 0 foundations: monorepo + web shell + supabase local + CI + docs scaffolding
- Phase 7 hardening
  - CI workflow now runs format/lint/typecheck/unit tests/build/Playwright + repo smoke, seeds data, and uploads Playwright artifacts for easier triage.
  - `SECURITY.md`, expanded `docs/threat-model.md`, `docs/reviewers.md`, `docs/demo-script.md`, and a new `docs/test-matrix.md` document the reviewer path, manual a11y checklist, and acceptance-to-test mapping.
  - Shared Playwright helper and a11y test normalized selectors/credentials, and `apps/web/scripts/rls-negative-tests.mjs` is gated via `pnpm policy:test`.
  - Added Supabase hardening indexes migration `00000000000008_phase7_hardening_indexes.sql`.
