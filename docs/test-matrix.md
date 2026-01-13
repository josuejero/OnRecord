# Test matrix

This maps acceptance criteria to automated checks.

## Phase 7

- Q7.1 CI gates
  - GitHub Actions workflow runs: format, lint, typecheck, build, Playwright
- Q7.2 `SECURITY.md`
  - Manual: file exists + contains reporting instructions
- Q7.3 Threat model updated
  - Manual: doc updated + references current architecture
- Q7.4 Changelog
  - Manual: `CHANGELOG.md` has Phase 7 entries
- Q7.5 Reviewer experience
  - Manual: `docs/reviewers.md` exists and works end-to-end

## Automated test inventory

### Web Playwright (apps/web/playwright)

- `auth.spec.ts`: login and role behavior
- `sessions.spec.ts`: session lifecycle
- `questions.spec.ts`: submission + queue ordering
- `moderation-answers.spec.ts`: approve/answer flows
- `public-recap.spec.ts`: publish/unpublish + public 404
- `assets.spec.ts`: asset visibility + public readability
- `needs-edit-resubmission.spec.ts`: reporter resubmission flow
- `a11y.spec.ts`: serious/critical a11y violations

### Policy negative tests

- `apps/web/scripts/rls-negative-tests.mjs`: must deny unauthorized writes

### Repo smoke e2e

- `e2e/tests/home.spec.ts`: home → demo room
