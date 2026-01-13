# Privacy-first demo data

## Threat model for demo fixtures

- Demo transcripts inherit the same sensitivity as live sessions: caregiver conversations, medical status updates, and appointment plans.
- Public commits must never contain live patient names, emails, phone numbers, or identifiers that can re-identify care teams.
- Any tooling that touches these transcripts needs to be repeatable and auditable so we can prove PII was removed.

## Redaction pipeline

- Raw data lives under `tools/insights/datasets/demo/raw/` and is intentionally git-ignored. Anything produced there should stay local.
- The downstream data we commit is the sanitized copy in `tools/insights/datasets/demo/redacted/`. Those JSONL snippets only reference non-identifying, caregiver-style language.
- Run `make refresh-demo-data` (or `python tools/insights/redact_dataset.py`) to process the raw inputs, applying regex filters for emails, phones, URLs, dates, and IDs. An optional `--presidio` flag adds Presidio entity detection when the analyzer is installed.
- Each run emits `redaction-report.json` with replacement counts and before/after snippets so we can inspect what was removed before pushing.

## Safeguards

- `.pre-commit-config.yaml` wires up `tools/insights/check_raw_dataset_commit.py` as a local hook so staged files under the raw directory are rejected. Run `pre-commit install` after cloning to activate it.
- Because the report surfaces sample contexts, review it whenever you regenerate data to confirm no personal identifiers slipped through.

## Demo refresh checklist

1. Populate `tools/insights/datasets/demo/raw/` with the sensitive transcripts you want to seed.
2. Run `make refresh-demo-data` to rewrite the redacted fixtures and update the report.
3. Seed the demo database by setting `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (or via `pnpm exec supabase`) and running `node apps/web/scripts/seed-demo-data.mjs` to load the synthetic transcripts, recap, and labels.
