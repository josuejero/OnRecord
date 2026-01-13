# Insights Tools

These scripts are intentionally run locally.

## Setup

```bash
cd tools/insights
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Environment

Create a `.env` file with:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Run

```bash
python topic_cluster.py --session-id <SESSION_ID> --k 5
```

Output is written to `artifacts/session_<id>_clusters.json`.

## Demo datasets

- All sensitive transcripts for insights live under `datasets/demo/raw/` (git-ignored). Treat this as the source of truth for unredacted caregiver notes.
- Sanitary fixtures stay in `datasets/demo/redacted/`. Commit only the redacted files and the generated `redaction-report.json`.
- To refresh the redacted fixtures, run `make refresh-demo-data` (or invoke `python tools/insights/redact_dataset.py --dataset demo`). Install `pre-commit` and run `pre-commit install` to enable the guard that blocks raw files from landing in git.
