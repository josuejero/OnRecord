# Accessibility

## Standards we target

- **WCAG 2.2 A/AA baseline**: color contrast, keyboard focus, semantic markup, and predictable behaviors so the UI stays usable for every recruiter.

## Patterns we follow

- **ARIA Authoring Practices for dialogs** ensure modals trap focus, announce their role/name, and restore focus to the trigger (see `DialogContent`/`DialogTrigger` in `@/components/ui/dialog`).
- **Keyboard interaction discipline** keeps focus visible, allows Tab/Shift+Tab navigation, and avoids mouse-only affordances.
- **Error messaging protocols** use inline alert regions (`role="alert"` + `aria-live="assertive"`) when forms fail so assistive tech and keyboard-only reviewers hear the same story as sighted users.

## How we test

- `@axe-core/playwright` fails the suite on any serious/critical violation and is wired to `pnpm --filter @onrecord/web test:e2e` via `apps/web/playwright/a11y.spec.ts`.
- `apps/web/playwright/accessibility.spec.ts` runs keyboard-first checks: the dev dialog demonstrates the ARIA modal pattern (focus trap + release) and the login form routes errors through an alert that exposes `aria-live`/`role="alert"` for screen readers.
- Keyboard-only smoke checks live alongside the suite so every CI run confirms the modal keyboards, alert reads, and the Axe baseline stay in place.
