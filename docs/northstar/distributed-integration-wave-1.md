# Distributed capability integration — wave 1

Common baseline: `7ceb9ceb7089086660004c6dc4fa4c7a10c940f9`.
Local integration branch: `codex/stabilization-units-20260919`.
Scope: prove common-first, independently owned work and sequential integration on
two small conformance units. No new portable UI or full processing-tool claim.

## Shared baseline completed first

[Common v1](./common-contract-baseline.md) fixes execution, values, identity,
terminal failure precedence, cleanup, edit/commit, native control compatibility,
domain ownership and performance evidence rules. Independent reviews identified
three terminal failure paths before freeze; the runtime repair plus five required
regressions passed full fast (484 files / 2,895 tests). Both part branches were
created afterwards from the exact common commit.

## Independent parts and reviewed merges

| Part                      | Branch                              | Reviewed commit                            | Local merge                                |
| ------------------------- | ----------------------------------- | ------------------------------------------ | ------------------------------------------ |
| SP06 Checkbox             | `codex/part-checkbox-20260919`      | `6c999aae0937bb4a276da25f0776da52b6c185ed` | `09abbef0723ba80a3ba5b4be8d20236b71ff05e3` |
| SP02 strict text adapters | `codex/part-text-adapters-20260919` | `b532af68b2ed45e4613e8106514437e367e97c15` | `396e9af8275b820b14fa55ebbe18986606ee28db` |

Each part used its own checkout and frozen-lockfile install. The integration
owner checked common ancestry and exact changed-path allowlists, reviewed the
test source independently of its producer, reran focused tests in the integration
checkout, ran commit-safety and then created each merge commit sequentially.
No conflict resolution or changes to shared production files were necessary.

- [Checkbox receipt](./parts/checkbox-receipt.md): seven cases; checked/form-value,
  callback order/event identity, label activation, focus/ref, reset/disabled/readOnly,
  required validity and cleanup. JSDOM adapter evidence only.
- [Text adapter receipt](./parts/text-adapter-receipt.md): six cases; exact refs,
  frozen definitions, strict admission/no coercion, handwritten Unicode/legacy
  parity, and repeated factory/concurrent runner consumption.

Part typechecks, focused lint/format, workspace isolation and commit-safety passed.
Part commits changed only their admitted test and receipt files. The integrator
alone adds their exact case names to `verification/units.json`: **9 units / 71
required cases**. No package versions, exports or release metadata changed.

## Combined verification

Status: `MERGED_LOCALLY / COMBINED_VALIDATION_PASS`. `pnpm validate:fast` passed:
**486 files / 2,908 tests**, plus **9 units / 71 required cases** in the fresh
required-unit gate against both merges and the central registry update. Static,
packed public consumers, dependency/export checks and bundle budgets passed.
Producer-distinct cross-reviews of both part commits and exact registry mappings
also returned PASS. Only documentation receipt updates followed that full run.
This local integration does not update develop, publish npm artifacts or migrate
consumers. No real browser/IME/native-host conformance was performed in this wave.

## Next parts

Processing and UI can continue in parallel, but each new implementation packet
must close its own domain choices. The next processing decision is JSON
input/output/number/size policy and algorithm placement (ST-004A); the next UI
decision is portable DOM delivery, package/CSS/event/form ownership (ST-005B).
Recipe/Mapping, authoring, appearance/shell and optional compatibility each get
their own packet and exclusive files when ready. Do not open all twelve projects
as simultaneous writers to common types or the release manifest.

A part that needs a shared semantic change submits a neutral failing example to
the integration owner; common v2 is reviewed/validated before dependent parts
adopt it. Future waves repeat ancestry/scope review, sequential merge, central
registration and combined validation rather than treating a conflict-free Git
merge as feature acceptance.
