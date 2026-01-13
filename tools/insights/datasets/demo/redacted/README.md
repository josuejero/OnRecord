# Demo redacted transcripts

This folder contains sanitized transcript excerpts used for privacy-friendly demos and insights prototyping. Each line is a JSON object with `session_id`, `speaker`, `text`, and supporting metadata.

To rebuild this folder from sensitive sources, place the raw files under `../raw/` and run `make refresh-demo-data` (or `python tools/insights/redact_dataset.py --dataset demo`).
