# Distributed capability integration — wave 3

Status: `MERGED_LOCALLY / SOURCE_REVIEW_PASS / COMBINED_VALIDATION_PASS`.
Date: 2026-09-19. Branch: `codex/stabilization-units-20260919`.
Admission commit: `c7c8a082f1c066fb8318ada5e416472302d41844`.
The [implementation packet](./implementation-wave-3.md) closed both units before
independent implementation. Shared execution/control semantics remain v1.

## Reviewed parts and sequential merges

| Unit                         | Part commit                                | Local merge                                |
| ---------------------------- | ------------------------------------------ | ------------------------------------------ |
| ST-004B strict bounded UTF-8 | `da0f9f60557a695419094645f4ffaa6385dd84d2` | `00d4d9b8c35ae9211b6657c3b497c5ff1ab0fb4c` |
| ST-005C four input hosts     | `0f1f7a31bb390094983d5ec0841e33d7e228414d` | `98c2505f172353bff994a0ca2ada99bd3855a2f2` |

Each part used its own worktree and install. The integration owner verified exact
admission ancestry and changed-path ownership, reviewed source and tests, reran
focused checks and commit-safety, then merged sequentially without conflicts.
Producer-distinct reviews passed for both exact part commits and the integrator's
public export, browser build/watch, required registry and packed-consumer changes.

- [UTF-8 part receipt](./parts/utf8-decode-receipt.md): 16 required cases covering
  genuine byte views, storage/length admission, malformed sequences, explicit BOM,
  output, option snapshots and common cancellation/budget/location behavior.
- [Host part receipt](./parts/input-hosts-receipt.md): 10 common scenarios per
  actual host, including framework cleanup and independent input state.
- Review found that a Svelte shared reactive request object could replay an old
  value when the other input updated. Separate per-input requests repair it;
  the common matrix now asserts preservation of both fresh native text and a
  previously refused composing update during unrelated field changes.

## Public capabilities and ownership

`@workbench-kit/field-remap/utf8-data-operations` exports
`createUtf8DecodeDataOperation` and its options type. Configure a positive
safe-integer `maxInputBytes` and explicit `bom: 'strip' | 'preserve'`, register
the definition, and invoke `{ id: 'bytes:utf8-decode', version: 1 }` through the
common runner. Inputs must be genuine Uint8Array views backed by fixed, attached
ordinary ArrayBuffer storage. Cross-realm views and Node Buffer are supported;
shared/resizable/detached storage, wrong view kinds, spoofed objects and oversized
views are rejected. The limit measures the view, not its backing allocation.

One fresh fatal native decoder produces a primitive string, including empty and
NUL-containing results. Malformed UTF-8 yields `execution-failed` with its original
TypeError; admission failures yield `invalid-input`. A native view avoids copying
input bytes. The operation retains common cancellation, nested location and
invocation-budget semantics. It is not streaming and does not preempt native
decoding or establish a CPU/allocation bound.

`@workbench-kit/platform/native-text-input` retains its binder API and source
types; import/default now resolve to built `dist/browser/native-text-input.js`.
A separate browser ESM build runs after the existing Node CJS build. Build/watch
fingerprints include the new config, with an actual filesystem watch regression.
The focused artifact has no imports, CSS, framework or provider dependency.

The packed file is **1,962 bytes**, SHA-256
`f06803397f6169e0edf9b8c97dd55eb94b8607f94de9628bd6a87fb0665f811f`.
All four hosts import these unchanged bytes through `/vendor/native-text-input.js`;
hash and module-graph checks reject source fallback or inlining. HTML's adapter is
not compiled. Framework fixture bundles use React 19.2.7, Vue 3.5.43 and Svelte
5.57.0. Vue/Svelte are exact root development dependencies; no publishable package
gains a framework dependency, version bump or common runtime API change.

## Combined verification

`pnpm validate:fast` passed both merges plus the integration changes:
**489 files / 2,948 tests**, followed by the fresh required-unit gate (**12 units /
111 required cases**). Typechecks, lint/format, exports, workspace/dependency and
Node CJS boundaries, schemas and Storybook tag checks passed. Only documentation
updates followed this run; formatting and commit-safety were checked before commit.

All 19 packages were freshly built, packed and installed outside the workspace at
the unchanged local cohort `0.0.2-prototype.0.2.6`. Public strict/exact-optional
type consumers pass. A real nested UTF-8-to-JSON operation runs headlessly through
the common runner with a three-invocation budget; malformed input preserves its
native cause, and oversize input is rejected. Native input imports without DOM
globals and runs in JSDOM. Existing initial gzip remains **253,011 / 253,064 bytes**;
no bundle budget was raised. Local packs do not prove published availability.

The packed gate also runs the real React, Vue and compiled Svelte runtimes with
JSDOM. All four hosts pass the same ten scenarios:

1. Native label and form ownership.
2. One callback per edit and none for property writes.
3. Framework value requests without edit or default-value mutation.
4. Same node, focus and selection through rerender and same-value updates.
5. Composition refuses updates without replay and isolates controls.
6. Composing same-value requests and blur release.
7. Native reset, required, disabled and read-only semantics.
8. Duplicate active binding rejection.
9. Actual framework unmount invalidates detached inputs and bindings.
10. Three actual remount cycles without duplicate callbacks.

React runs development StrictMode effect replay. Every intermediate unmount
asserts balanced setup/disposal; the final fixture intentionally keeps two inputs
live for manual use. Failures and child runtime errors fail the packed gate.

## Real browser evidence and reproduction

Generate the fixture from fresh packs, then serve its retained static output:

```powershell
pnpm check:packed-consumer
pnpm exec vite preview --outDir tmp/native-input-hosts/dist --host 127.0.0.1 --port 5189 --strictPort
```

Open the index at `http://127.0.0.1:5189/`. Its four links select HTML, React, Vue
and Svelte. The preview serves generated artifacts without source transformation;
the index displays the artifact hash. Generated bundles stay gitignored, while
source fixtures and checks remain committed.

In a real in-app browser, **all four hosts reported all ten scenarios PASS**.
Additional manual interactions passed in each host: label click focused the
native input; typing `abc` produced exactly three more edits; setting `remote`
added no edit; checking selection retained focus and range 1–3; native reset
restored `default` without callbacks; unmount/mount restored two active bindings
with the expected setup/disposal counts. The HTML unmounted snapshot additionally
showed zero active bindings and balanced counts. The temporary server and browser
tab were closed after verification.

These are the same 40 scenarios repeated across JSDOM and a browser, not 80
distinct scenarios. ASCII typing and synthetic composition do not establish real
operating-system IME behavior. Shared styling, broader keyboard/submit scenarios,
Checkbox and PropertyRow remain separate. Full Storybook play/release validation,
develop integration, npm publication and consumer adoption were not performed.

## Next bounded parts

1. **Processing:** close a validation/filter unit's accepted shape, predicate
   ownership, rejection/exclusion distinction, output order and resource limits.
   Keep schema validation, filtering and Recipe sequencing separate.
2. **Controls:** close native Checkbox checked/value/reset/indeterminate semantics,
   then PropertyRow label/control/diagnostic composition. Reuse the four-host
   harness; track real Korean IME and shared styling as independent acceptance.
3. **Consumer preparation:** continue UI/UX and draft/commit/selection plans.
   Adopt only after approved publication and consumer flow/persistence evidence.

These are design queues, not automatic implementation admission. Future parts
branch from one recorded integrated common commit; public exports, shared runtime
and required-case registration remain integration-owner responsibilities.
