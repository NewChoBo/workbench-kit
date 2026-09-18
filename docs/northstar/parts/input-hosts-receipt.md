# ST-005C — four native input hosts receipt

Part status: implementation and independent fixture checks passed. Fresh packed
execution, real-browser checks and the combined gate belong to integration.

- Common v1: `7ceb9ceb7089086660004c6dc4fa4c7a10c940f9`.
- Admitted wave-3 base: `c7c8a082f1c066fb8318ada5e416472302d41844`.
- Owned paths: `scripts/fixtures/native-input-hosts/**`,
  `scripts/lib/native-input-hosts.mjs`, and this receipt. No public API, runtime
  dependency, build/export metadata, package source or central registry changed.

## Delivery

`verifyNativeInputHosts({ repoRoot, platformRoot, outputDir })` consumes a platform
package whose focused import/default export names
`./dist/browser/native-text-input.js`. It returns
`{ artifactSha256, hosts, browserOutputDir }`; each host summary contains its exact
case names and setup/disposal counts. `outputDir` must be an empty dedicated
directory. Node 24 runs each host in its own JSDOM child, resolving the external
vendor import to the copied artifact without compiling or transforming it.

HTML's ordinary module entry and common matrix are copied unchanged. React, Vue
and Svelte entries import the same external `/vendor/native-text-input.js`; Vite
bundles only their fixture/runtime code and rejects an included platform module.
Artifact hashes must remain equal through all hosts and the retained browser copy.
React 19.2.7 explicitly uses development mode to exercise StrictMode effect replay.
Vue 3.5.43 uses mounted/unmounted hooks and a per-field watcher. Svelte 5.57.0 is
compiled by its own compiler and uses synchronous onMount cleanup and independent
per-field update requests. There is no second framework owner for input `.value`.

Lifecycle choices follow the official [React effect contract](https://react.dev/reference/react/useEffect),
[Vue lifecycle hooks](https://vuejs.org/api/composition-api-lifecycle.html) and
[Svelte lifecycle hooks](https://svelte.dev/docs/svelte/lifecycle-hooks).

## Common matrix

Each of HTML, React, Vue and Svelte passes all ten exact cases:

1. `native label and form ownership`
2. `one callback per edit and no property-write callback`
3. `framework value request without edit or default mutation`
4. `same node focus and selection through rerender and same value`
5. `composition refuses updates without replay and isolates controls`
6. `composing same value and blur release`
7. `native reset required disabled and readOnly semantics`
8. `duplicate active binding is rejected`
9. `framework unmount invalidates detached input and binding`
10. `three actual remount cycles without duplicate callbacks`

Case 3 also rejects replay of a stale primary request after native typing and an
unrelated secondary update. Case 5 rejects replay of a refused primary request
after composition ends, including unrelated rerenders and secondary updates;
only an explicit primary retry may apply it. Case 9 uses the actual detached node
and old binding after framework unmount. Every fully unmounted cycle requires
equal setup/disposal counts. A final interactive mount leaves exactly two active
bindings: React totals 20 setups / 18 disposals, other hosts 10 / 8.

## Validation and reproduction

Independent frozen install completed with Node 24.18.0 and pnpm 11.5.1. The helper
passed 40 host cases against a local build candidate with artifact SHA-256
`f06803397f6169e0edf9b8c97dd55eb94b8607f94de9628bd6a87fb0665f811f`
(1962 bytes). This artifact was provided by the integration build and copied into
an ignored development-only package directory; this run does not establish a
fresh tarball or npm publication result.

Commands/checks performed:

- `pnpm install --frozen-lockfile`
- `node --input-type=module` invocation of `verifyNativeInputHosts` with the local
  candidate package and an empty output directory: all four matrices passed.
- Negative helper checks: reject nonempty output; reject a source-only focused
  export; reject a disposable artifact mutation that invokes one edit callback
  twice, with the expected `Input edit was lost or duplicated` failure.
- `pnpm exec eslint scripts/fixtures/native-input-hosts scripts/lib/native-input-hosts.mjs`
- `pnpm exec prettier scripts/fixtures/native-input-hosts scripts/lib/native-input-hosts.mjs docs/northstar/parts/input-hosts-receipt.md --check`
- `pnpm check:workspace-isolation`
- `pnpm check:commit-safety`
- `git diff --cached --check`

To reproduce against a freshly extracted platform package, run from the repository
root, substituting the two argument paths:

```powershell
node --input-type=module -e "import {verifyNativeInputHosts} from './scripts/lib/native-input-hosts.mjs'; console.log(await verifyNativeInputHosts({repoRoot:process.cwd(),platformRoot:process.argv[1],outputDir:process.argv[2]}));" <platform-package-root> <empty-output-directory>
```

Successful execution retains static output under `tmp/native-input-hosts/dist`.
Its checked root and output must not be symlinks or overlap the source output.
Serve that directory as the HTTP root so `/vendor/native-text-input.js` resolves.
Open `/html/`, `/react/`, `/vue/` and `/svelte/`; each auto-runs the matrix, reports
explicit PASS/FAIL, then leaves two labeled native inputs and remote-value,
selection, reset, unmount and mount controls for real-browser inspection.

## Limits

JSDOM proves framework lifecycle and event contracts under synthetic events.
Label association here does not establish real pointer activation. Real typing,
label activation, focus, reset and remount must also be checked in a browser using
the retained fresh packed artifact. Synthetic composition does not prove OS IME
behavior. Development fixture bundles are not a production framework benchmark.
This part covers four-host native text input only; portable styling, Checkbox,
PropertyRow, published framework adapters and host commit policy remain separate.
