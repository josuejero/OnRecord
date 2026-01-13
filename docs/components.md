# Component Library Mini-Slice

This mini design system fronts the polish work for the recruiter-visible flows. The new pieces live under `apps/web/src/components/ui/` (and a few sibling files) and are opted into in two ways:

- **Globally**: `apps/web/src/components/ui/sonner.tsx` mounts a Sonner `<Toaster />` that is rendered via `apps/web/src/app/layout.tsx`.
- **Locally**: `EmptyState`, `ErrorState`, and `ClientErrorBoundary` live in `apps/web/src/components` (outside `ui/`) so server and client routes can share them.

## Toast vs Inline Alert

- **Toasts** (Sonner) are for global, ephemeral confirmations or failures such as “Saved”, “Published”, “Download started”, and “Network error.” They belong at the layout level so that any component can push a toast without threading props.
- **Inline `Alert`** components are for contextual issues inside a panel (e.g., form validation failures, permission denials, session load errors). Inline alerts render with `role="alert"` and the correct `aria-live` setting so assistive tech reads them immediately.

## Skeleton (`ui/skeleton.tsx`)

- Use skeleton shapes to reserve space for tables, headers, cards, charts, or placeholders while waiting for data.
- Customize height/width via the `size` and `width` variants or pass utility classes through `className` for unique layouts.

## Table (`ui/table.tsx`)

- Wrap semantic `<table>` markup with the provided helpers (`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHeadCell`, `TableCell`, etc.) so spacing, borders, and hover styles stay consistent.
- Toggle tighter spacing with the `size="dense"` prop and turn on sticky headers by passing `stickyHeader` to `Table`. Rows support hover effects and a `selected` state for keyboard-rich tables.

## Dialog (`ui/dialog.tsx`)

- Built on Radix Dialog, the component set wires the focus trap/ESC behavior and exposes `DialogTitle`/`DialogDescription` for WAI-ARIA announcements.
  - ESC closes the dialog and returns focus to the trigger.
  - Focus stays inside the dialog while it is open.
  - The title/description pair is connected to the dialog container so screen readers announce the modal purpose.

## Alert (`ui/alert.tsx`)

- Use the alert variants (`default`, `error`, `warning`, `info`, `success`) for inline feedback. Each alert adds `role="alert"` plus `aria-live="assertive"` for error/warning variants.
- Use `AlertTitle`/`AlertDescription` to structure the headline and body copy inside the alert container.

## EmptyState (`components/empty-state.tsx`)

- Standard props: `icon`, `title`, `description`, and an optional `action` slot for buttons or links.
- Replace one-off “No rooms found” or similar copy with this component to keep spacing and tone consistent.

## ErrorState (`components/error-state.tsx`)

- Use this layout inside route error boundaries or anywhere a retry + “Go home” flow is needed.
- Props: `title`, `message`, `onRetry`, `retryLabel`, `homeLabel`, `homeHref`. It already renders a `Button` and a `Link` so handlers don’t need to be reimplemented.

## LoadingButton (`components/loading-button.tsx`)

- Wrap any heavy action (Publish, Start session, Upload, Save answer, etc.) so the button displays a spinner, preserves width, and disables while the async work runs.
- Supply `loadingText` to give screen readers context about the pending state.

## ClientErrorBoundary (`components/client-error-boundary.tsx`)

- Use this boundary around risky client panels that subscribe to realtime data (e.g., `QuestionQueueClient`). It exposes a `fallback` or `fallbackRender` prop and calls `onReset` when retrying.
- The default fallback renders `ErrorState`, so you get a retry button plus a “Go home” link without wiring additional markup.
