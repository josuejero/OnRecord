PYTHON ?= python3

.PHONY: refresh-demo-data

refresh-demo-data:
	$(PYTHON) tools/insights/redact_dataset.py \
		--dataset demo \
		--raw-dir tools/insights/datasets/demo/raw \
		--redacted-dir tools/insights/datasets/demo/redacted \
		--report tools/insights/datasets/demo/redacted/redaction-report.json
