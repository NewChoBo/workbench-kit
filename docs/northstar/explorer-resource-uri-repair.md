# Explorer resource identity repair

WB-ST-020B: `READY_FOR_IMPLEMENTATION`, discovered while validating WB-ST-020.

Outcome: `LOCALLY_INTEGRATED / SOURCE_REVIEW_PASS / COMBINED_VALIDATION_PASS`.
See the [combined verification receipt](./explorer-context-verification.md).

The real sample rename journey preserves a multilingual filename in Explorer,
but opening it displays the text editor placeholder instead of the file content.
The workspace resource parser currently keeps URL-escaped pathname bytes as the
workspace key. A normalized resource URI and its decoded workspace path must
refer to the same file.

Keep the existing public URI and workspace host APIs. The formatter must encode
path segments and the parser must decode them once, preserving structural path
separators. Ordinary ASCII paths stay unchanged; raw Unicode/space input accepted
by URL parsing continues to resolve. Literal percent sequences, query/fragment
characters and Unicode in a filename must round-trip without aliasing another
file. Reject malformed escapes and encoded path separators instead of silently
reinterpreting path structure. Do not add a second resource registry or patch
the editor with fixture content.

The part owns the workspace resource URI implementation and adjacent regressions,
plus workspace-host lookup/save regressions and a receipt. Audit related resource
parsers before editing; any required additional owner must be recorded here before
its source changes. No new package, dependency, schema or persistence engine.

First reproduce the failed URI lookup. Verify ASCII compatibility, Unicode,
spaces, literal percent, reserved characters, malformed escapes and separator
rejection. Through the real workspace host, rename a fixture, resolve it by URI,
save to that same path and preserve the other files. The integrator retains the
real Monaco content comparison in RenameRetry, reviews the exact part and runs
combined typechecks, focused tests, browser plays and full fast validation. The
existing packed budget stays unchanged unless a measured review admits a change.

This repair establishes resource identity and content preservation in the virtual
workspace. It does not claim disk persistence, Electron behavior or publication.

## Legacy editor-state compatibility

Review found persisted tabs use unversioned raw resource URIs. An old `%41.txt`
tab must not become `A.txt`, and `%20.txt` must not become a space-named file when
the codec changes. Admit the integrator-owned `shell-react/src/editor/state-storage.ts`
and its adjacent tests before changing this compatibility boundary.

New serialized editor state records the workspace URI encoding. When that marker
is absent, preserve the old parser's effective workspace path (normalized URL
pathname without decoding) and encode it with the new formatter. Keep group/tab
IDs and selection, do not rewrite non-workspace URIs, and do not migrate a marked
state twice. Unknown encoding markers and malformed workspace identities fail
closed. Reading does not write storage; the next ordinary state save records the
new marker. This only migrates the repository-owned editor-state format; external
hosts that persist URI strings must follow the same codec transition before
adopting a release. No release is performed in this packet.

Reproduce restored `%41.txt` and `%20.txt` alongside their decoded neighbors.
Verify host resolution and Save target the original literal-percent files, while
new encoded Unicode and reserved-name tabs survive repeated writes/reads.

## Measured packed-size admission

At source candidate `7484bafc`, the old 253,192-byte initial gzip budget stops the
combined gate at **253,439 bytes**. The Explorer-only candidate measured 253,169;
the additional URI codec and required legacy migration account for **270 bytes**.
A producer-distinct source/log review approves a bounded **253,472-byte** ceiling
(280-byte allowance increase, 33 bytes of measured headroom).

Both builds transform 2,290 modules and retain the same CSS asset/hash (342,764
bytes / 49,730 gzip), font and worker assets, and graph runtime chunk. There are
no package, dependency, lockfile or CSS changes. The old budget fails before later
closure assertions, so its log is not proof of the complete static closure. A
fresh passing packed run must reach every unchanged Monaco exclusion, CSS,
static-closure and focused-consumer assertion. This is a source-specific
correctness allowance, not a general budget increase for future work.
