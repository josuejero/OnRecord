"""Exit early if a raw dataset path is staged for commit."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

BLOCKED_PREFIX = Path("tools/insights/datasets/demo/raw")


def get_staged_paths() -> list[Path]:
    result = subprocess.run(
        ["git", "diff", "--cached", "--name-only"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
    )
    return [Path(line) for line in result.stdout.splitlines() if line]


def main() -> int:
    try:
        staged = get_staged_paths()
    except subprocess.CalledProcessError as exc:
        print("Unable to inspect git staging area:", exc, file=sys.stderr)
        return 1

    violations = [path for path in staged if BLOCKED_PREFIX in path.parents or path == BLOCKED_PREFIX]
    if not violations:
        return 0

    print("Detected raw demo data in staged files:")
    for path in violations:
        print(f"  - {path}")
    print("Move these files to tools/insights/datasets/demo/redacted or regenerate via the redaction pipeline before committing.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
