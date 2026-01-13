"""Redact sensitive content from dataset batches."""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple, Union

DEFAULT_PATTERNS = {
    "email": (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", "[REDACTED_EMAIL]"),
    "phone": (r"\b(?:\+?\d{1,2}[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b", "[REDACTED_PHONE]"),
    "url": (r"https?://\S+|www\.\S+", "[REDACTED_URL]"),
    "date": (r"\b(?:\d{1,2}[/-])?\d{1,2}[/-]\d{2,4}\b", "[REDACTED_DATE]"),
    "id": (r"\b(?:ID|id|case|ticket)[:=#]?\s*[A-Za-z0-9-]+\b", "[REDACTED_ID]"),
}

SNIPPET_LIMIT = 3
SAMPLE_LENGTH = 120


class RedactionTracker:
    def __init__(self) -> None:
        self.counts: Counter[str] = Counter()
        self.snippets: Dict[str, List[Dict[str, str]]] = defaultdict(list)

    def record(self, category: str, before: str, after: str) -> None:
        self.counts[category] += 1
        if len(self.snippets[category]) >= SNIPPET_LIMIT:
            return
        snippet_before = before.strip().replace("\n", " ")[:SAMPLE_LENGTH]
        self.snippets[category].append({"before": snippet_before, "after": after})


def compile_patterns(patterns: Dict[str, Tuple[str, str]]) -> Dict[str, Tuple[re.Pattern, str]]:
    return {name: (re.compile(pattern, re.IGNORECASE), replacement) for name, (pattern, replacement) in patterns.items()}


def load_presidio_engine() -> "AnalyzerEngine":
    try:
        from presidio_analyzer import AnalyzerEngine
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise RuntimeError(
            "Presidio analyzer not installed. Run `pip install presidio-analyzer` to use --presidio."
        ) from exc
    return AnalyzerEngine()


def redact_text(text: str, compiled: Dict[str, Tuple[re.Pattern, str]], tracker: RedactionTracker) -> str:
    redacted = text

    for name, (pattern, replacement) in compiled.items():
        def _repl(match: re.Match[str]) -> str:  # noqa: WPS430
            tracker.record(name, match.group(0), replacement)
            return replacement

        redacted = pattern.sub(_repl, redacted)

    return redacted


def apply_presidio(redacted_text: str, analyzer: Any, tracker: RedactionTracker) -> str:
    if not analyzer:
        return redacted_text

    results = analyzer.analyze(text=redacted_text, language="en")
    if not results:
        return redacted_text

    safe = redacted_text
    for result in sorted(results, key=lambda r: r.start, reverse=True):
        start = int(result.start)
        end = int(result.end)
        if end <= start or start < 0 or end > len(safe):
            continue
        before = safe[start:end]
        placeholder = f"[REDACTED_{result.entity_type.upper()}]"
        tracker.record(f"presidio_{result.entity_type.lower()}", before, placeholder)
        safe = safe[:start] + placeholder + safe[end:]

    return safe


def redact_value(value: Any, compiled: Dict[str, Tuple[re.Pattern, str]], tracker: RedactionTracker, analyzer: Any) -> Any:
    if isinstance(value, str):
        processed = redact_text(value, compiled, tracker)
        return apply_presidio(processed, analyzer, tracker)
    if isinstance(value, dict):
        return {key: redact_value(val, compiled, tracker, analyzer) for key, val in value.items()}
    if isinstance(value, list):
        return [redact_value(item, compiled, tracker, analyzer) for item in value]
    return value


def read_json_records(path: Path) -> Tuple[List[Any], bool]:
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".jsonl":
        records = [json.loads(line) for line in text.splitlines() if line.strip()]
        return records, True
    data = json.loads(text)
    if isinstance(data, list):
        return data, True
    return [data], False


def write_redacted(path: Path, records: List[Any], is_array: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix.lower() == ".jsonl":
        with path.open("w", encoding="utf-8") as out:
            for record in records:
                out.write(json.dumps(record, ensure_ascii=False))
                out.write("\n")
        return

    with path.open("w", encoding="utf-8") as out:
        if is_array:
            json.dump(records, out, ensure_ascii=False, indent=2)
        else:
            json.dump(records[0] if records else {}, out, ensure_ascii=False, indent=2)


def collect_files(directory: Path) -> List[Path]:
    if not directory.exists():
        raise FileNotFoundError(f"Raw dataset directory not found: {directory}")
    return sorted([path for path in directory.iterdir() if path.is_file() and not path.name.startswith(".")])


def build_report(dataset: str, file_stats: Dict[str, Any], total: Counter[str], report_path: Path) -> None:
    payload = {
        "dataset": dataset,
        "files": file_stats,
        "totals": dict(total),
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def process_dataset(args: argparse.Namespace) -> None:
    raw_dir = Path(args.raw_dir)
    redacted_dir = Path(args.redacted_dir)
    report_path = Path(args.report)
    dataset_name = args.dataset

    files = collect_files(raw_dir)
    if not files:
        print(f"No raw files found in {raw_dir}.")
        return

    compiled = compile_patterns(DEFAULT_PATTERNS)
    analyzer = load_presidio_engine() if args.presidio else None
    file_reports: Dict[str, Any] = {}
    total_counts: Counter[str] = Counter()

    for source in files:
        records, is_array = read_json_records(source)
        tracker = RedactionTracker()
        redacted_records = [redact_value(record, compiled, tracker, analyzer) for record in records]
        target = redacted_dir / source.name
        write_redacted(target, redacted_records, is_array)

        file_reports[source.name] = {
            "records": len(records),
            "counts": dict(tracker.counts),
            "snippets": dict(tracker.snippets),
        }
        total_counts.update(tracker.counts)
        print(f"Processed {source.name}: {len(records)} records, {sum(tracker.counts.values())} replacements")

    build_report(dataset_name, file_reports, total_counts, report_path)
    print(f"Redacted dataset written to {redacted_dir}. Report saved to {report_path}.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Redact demo datasets before committing them.")
    parser.add_argument("--dataset", default="demo", help="Dataset identifier (folder name under tools/insights/datasets)")
    parser.add_argument("--raw-dir", default="tools/insights/datasets/demo/raw", help="Directory holding raw files")
    parser.add_argument("--redacted-dir", default="tools/insights/datasets/demo/redacted", help="Output directory for redacted files")
    parser.add_argument("--report", default="tools/insights/datasets/demo/redacted/redaction-report.json", help="Report path")
    parser.add_argument("--presidio", action="store_true", help="Enable Presidio analyzer for additional entity detection")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        process_dataset(args)
    except Exception as exc:  # pragma: no cover - script entry point
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
