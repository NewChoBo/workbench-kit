import { verifyNativeControlHosts } from './native-control-hosts.mjs';
import { source as svelteSource } from '../fixtures/native-checkbox-hosts/svelte-component.mjs';

export function verifyNativeCheckboxHosts(options) {
  return verifyNativeControlHosts({
    ...options,
    controlName: 'native-checkbox',
    fixtureName: 'native-checkbox-hosts',
    fixtureApiName: 'nativeCheckboxFixture',
    virtualId: 'virtual:native-checkbox-svelte',
    svelteSource,
    caseCount: 12,
    page: (
      host,
    ) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${host} native checkbox fixture</title></head>
<body><h1>${host}: shared native checkbox</h1><p>Native HTML controls; one packed optional binder. Edits do not save documents.</p>
<p><button id="remote">Set checked</button> <button id="mixed">Set mixed</button>
<button id="focus">Check focus</button> <button id="disable">Toggle disabled</button>
<button id="unmount">Unmount host</button> <button id="mount">Mount host</button></p>
<div id="host"></div><pre id="status" role="status">Starting</pre><script type="module" src="./entry.mjs"></script></body></html>`,
  });
}
