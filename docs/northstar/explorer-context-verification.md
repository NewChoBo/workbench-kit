# Explorer context and resource identity verification

Date: 2026-09-19. Contracts: [WB-ST-020](./explorer-context-ux.md) and
[WB-ST-020B](./explorer-resource-uri-repair.md). Runtime candidate: `7484bafc`;
combined validation candidate including the measured budget: `3ba8b78a`.
Status: `LOCALLY_INTEGRATED / SOURCE_REVIEW_PASS / COMBINED_VALIDATION_PASS`.

## Independently reviewed parts

- Component part `126212ec`, integrated as `edbc2c77`: normalized pointer, More
  and keyboard requests; selected-set/anchor preservation with the actual target
  focused; native rename menus and draft protection; real row focus navigation.
  Review caught suppressed scrolling during keyboard navigation. Ordinary focus
  now exposes the target, with an additional browser Home/End overflow assertion.
- Shell connection `346e6b64`: the existing menu builder and command/controller
  own actions. Menus retain their invoker and workspace identity, return focus on
  Escape and disappear when the service/snapshot changes or inline editing starts.
- URI part `8eabf47c`, integrated as `3a93ab3b`: segment encoding and exactly-once
  decoding preserve multilingual and reserved filenames. Malformed escapes and
  encoded separators cannot create another workspace file through Save.
- Storage migration `27bb90b1`: new saved editor state marks URI encoding. Old
  tabs preserve the previous parser's effective identity, including literal `%41`
  and `%20` files beside their decoded neighbors. Review also caught URL whitespace
  classification; leading spaces and embedded tabs now use parsed protocol
  ownership. Reading does not rewrite persisted bytes, and repeated writes/reads
  do not re-encode canonical identities. Unknown encoding markers fail closed.

The context part reproduced 11 of 12 new cases before implementation. Shell tests
reproduced invoker and stale-menu failures. URI and storage regressions reproduced
content lookup failure, wrong neighboring targets and unversioned restore errors.
The combined focused suite passes **46 cases** across component, menu builder,
shell view, URI, workspace host and storage behavior.

## Real sample browser evidence

All three `storybook-play-explorer-context` Chromium plays pass at `7484bafc`:

- `TargetParity`: pointer/More/Shift+F10 agree, Escape returns to the invoker,
  opening context does not open a file or expand a folder, menu placement remains
  visible, Home/End moves actual focus and exposes the last row in a long list.
- `RenameRetry`: cancellation leaves the original file; invalid input retains
  the same draft for retry and native context use; a long multilingual rename
  opens the exact original Monaco content, with the neighboring file unchanged.
- `MultiSelection`: all entry routes keep the selected pair and proper multi-file
  commands; an unselected target becomes the sole selection; Escape → ArrowDown
  → F2 addresses the next visible row.

The fixture uses the actual sample App, virtual workspace, commands, Explorer and
Monaco. It remounts per story and clears the editor-state storage key as well as
sample preferences. A persistent user-event instance carries Control across the
multi-selection click. More uses focus-within reveal, and pointer setup waits for
the preceding scroll frame rather than letting that event dismiss the menu.

```sh
pnpm exec test-storybook --url http://127.0.0.1:61228 --includeTags storybook-play-explorer-context --maxWorkers 1 --testTimeout=90000
```

The in-app browser also verified native right-click → Escape → ArrowDown with
no editor opened, and Home/End exposing the first/last Explorer rows. The final
1280 × 720 screen shows the long multilingual name in Explorer and the editor
breadcrumb, the original App source in Monaco and all four More menu actions
inside the viewport. These are
virtual-workspace and renderer results, not disk or Electron persistence evidence.
Native context-event passthrough is tested; operating-system menu rendering is not.

## Combined gate

`pnpm validate:fast` passes at `3ba8b78a`: **501 files / 3,096 tests**, typechecks,
exact-optional checks, lint, format, public exports, packed consumers, static
boundaries, schemas, story tags and workspace isolation. The registry passes
**25 units / 272 named required cases**; it remains a partial capability inventory.
Four additional ownership units cover component context, shell context, workspace
resource identity and saved editor URI migration.

The fresh packed initial consumer contains one static chunk: JS **480,063 bytes /
142,724 gzip**, CSS **342,764 / 49,730 gzip**, one static asset **125,828 / 60,985
gzip**, total **253,439 / 253,472 gzip**. URI compatibility adds 270 measured gzip
bytes over the preceding Explorer candidate. Independent review admitted only
the documented 280-byte ceiling increase; dependencies, CSS and static asset
membership stay unchanged. The fresh passing run reaches all later closure,
Monaco CSS and focused-consumer assertions.

Packed native input checks pass 10 cases in each of HTML, React, Vue and Svelte;
native checkbox checks pass 12 in each. These consume the same native component
implementation without adding framework wrappers.

Local evidence logs: `tmp/explorer-validate-fast.log`,
`tmp/explorer-story-play.log` and the retained pre-admission size failure
`tmp/explorer-budget-failure.log`. The final receipt/status change is documentation
only and receives format and commit-safety validation separately.

## Remaining boundaries

This is a local implementation, not develop promotion, publication or host
adoption. External hosts persisting resource URI strings must migrate their own
storage before consuming the codec change. No second persistence/history engine
or framework wrapper was added.

Visible durable-save failure/retry and reversible Inspector sessions remain
separate packets. Existing inline rename cancellation preserves the file but does
not yet restore row focus after the input unmounts; that follow-up is distinct
from the completed context-menu Escape restoration.
