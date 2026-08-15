# Recursive architecture research cycle

This protocol turns each hourly Chat heartbeat into one evidence-backed step in
a longer architecture research program. It does not authorize product code.

## 1. Restore the research graph

Read `research/index.json`, recent reports for the selected topic, current goal
documents, and the relevant source boundary. Mark conclusions stale when their
source, version, product behavior, or project SHA no longer matches.

## 2. Choose one research lane

Select one queued question from these lanes:

1. development direction and goal alignment;
2. architecture and ownership boundaries;
3. repository and project-structure patterns;
4. current technology, standards, and platform changes;
5. papers and academic research;
6. comparable or established products;
7. distinctive strengths and defensible advantages;
8. lessons and capabilities to evolve;
9. weaknesses to improve or responsibilities to retire;
10. verification strategy and long-term evolution.

Do not repeat a question unless new evidence invalidates the prior result.

## 3. Build an evidence packet

Prefer current primary sources: repository source and tests, official product
documentation, standards, specifications, original papers, and vendor release
notes. Record title, URL or repository path, publication/version date, access
date, and the exact claim each source supports. Separate facts, inferences,
hypotheses, and recommendations.

## 4. Compare applicability

Compare at least the current design and one credible alternative. For product
comparisons, distinguish observed behavior from marketing claims. Evaluate
ownership, compatibility, migration cost, operational risk, user value, and
whether the idea belongs in a reusable library or an integrating product.

## 5. Issue a bounded verdict

Classify each material finding as `maintain`, `learn`, `evolve`, `improve`,
`retire`, or `not_applicable`. State trade-offs, confidence, disconfirming
evidence, and the condition that would change the verdict.

## 6. Persist one recursive step

Write only under `docs/**` or `.newchobo/automation/research/**`. Create one
report, update affected factual docs when justified, and update the research
index atomically. Validate formatting, source completeness, index consistency,
and the control plane before one local commit on the dedicated branch.

## 7. Generate the next frontier

Add the smallest non-duplicate next questions exposed by this run. Link them to
the superseded or supporting report, set a priority and attempt count, and stop
after one material research item.
