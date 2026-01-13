# Security Policy

## Supported versions

This is an early-stage project. Only the `main` branch is supported.

## Reporting a vulnerability

If you believe you have found a security vulnerability:

1. Do not open a public GitHub issue.
2. Email the maintainer at `security@onrecord.local` with:
   - a clear description of the issue
   - steps to reproduce
   - affected endpoints/routes
   - impact assessment (what an attacker gains)

## What to expect

- You will receive an acknowledgement within 72 hours.
- If confirmed, a fix will be prioritized and released as soon as possible.

## Sensitive data handling

- Never commit `.env*` files.
- Never expose `SERVICE_ROLE` keys to the browser.
- Treat Supabase Storage private buckets as private by default.

## Safe defaults

- RLS is enabled on all tables.
- Privileged actions are gated by roles.
- Public recap pages only render published content.
