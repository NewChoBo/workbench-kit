# Local integration — 2026-10-21

This candidate combines `1857e9eca5bcf0aefc502163fdb3c51a60fc8409` with the
three local commits through `61786ccf5e6ee598474b40c6ea01f38ef8472a92` and the
six-file collection-region filter snapshot accepted on 2026-10-10.
The common base is `276fdbc7871b96ca8e42c9d2170fcfe7f01f250d`.

The integrated behaviors are collection filter admission, transient selection
and paired-capture filtering; SidebarTree keyboard focus synchronization; and
absent structured-path handling. The portable layout, native PropertyRow and
JSON PanelLoading work already present at `1857e9ec` is preserved byte-for-byte.
The local commit paths and earlier integration paths do not overlap.

## Acceptance

A producer-distinct reviewer verified the exact six snapshot hashes, all 41
paths from the earlier integration, the remaining merged source, and the public
boundary. The filter implementation is unchanged from the hashes recorded in
[its accepted packet](../northstar/collection-region-filter.md).

Executed on the combined source:

- `pnpm validate:fast`: PASS; 555 Vitest files, 4,333 passed and 3 skipped cases,
  plus the Node hook checks. All 30 registered verification units were found.
- Focused filter, repeat and public-entry tests: 55 passed. These overlap the
  full test run and are not additional coverage counts.
- `pnpm validate:packaging`: PASS; fresh workspace artifacts, 19 packed packages,
  external TypeScript/runtime/bundle consumers and isolated CommonJS leaves.
- Separate external packed filter proof: the contracts and JDW tarballs were
  extracted outside the workspace. Strict TypeScript and the existing filter
  and public-entry suites imported only the public `ui-authoring/v3` entry;
  all seven cases passed. This explicitly covers the four filter functions and
  their exported type contracts beyond the general packed-consumer checks.

Existing runtime observations for the unchanged sidebar implementation and the
earlier integration remain recorded in their respective packets. This receipt
does not claim a new Sample observation.

This is a local integration candidate. No registry publication, tag, main
promotion or release is implied. Consumers of the new filter API still require
an explicitly recorded local checkout until an authorized exact cohort release.
