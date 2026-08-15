# Architecture research ledger

This directory stores the recursive research state for the dedicated
`codex/automation-control-plane` branch. It is not product runtime state.

- `index.json` is the queue and lineage graph.
- `record.schema.json` defines the machine-checkable metadata for one finding.
- `reports/` contains human-readable evidence reports created by later runs.

Each report must include the research question, current project evidence,
primary sources, a comparison matrix, facts versus inference, strengths,
lessons, evolve/improve/retire candidates, risks, verdict, confidence,
disconfirming evidence, and next questions. A report may update related factual
documents, but scheduled writes cannot leave `docs/**` and this research tree.
