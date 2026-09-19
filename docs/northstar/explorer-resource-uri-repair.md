# Explorer resource identity repair

WB-ST-020B: `READY_FOR_IMPLEMENTATION`, discovered while validating WB-ST-020.

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
