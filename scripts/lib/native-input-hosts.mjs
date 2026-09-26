import { verifyNativeControlHosts } from './native-control-hosts.mjs';
import { source as svelteSource } from '../fixtures/native-input-hosts/svelte-component.mjs';

export function verifyNativeInputHosts(options) {
  return verifyNativeControlHosts({
    ...options,
    controlName: 'native-text-input',
    fixtureName: 'native-input-hosts',
    fixtureApiName: 'nativeInputFixture',
    virtualId: 'virtual:native-input-svelte',
    svelteSource,
    caseCount: 10,
    page: (
      host,
    ) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${host} native input fixture</title></head>
<body><h1>${host}: shared native input</h1><p>One packed browser artifact. Edit callbacks do not save documents.</p>
<p><button id="remote">Set remote value</button> <button id="selection">Check selection</button>
<button id="unmount">Unmount host</button> <button id="mount">Mount host</button></p>
<div id="host"></div><pre id="status" role="status">Starting</pre><script type="module" src="./entry.mjs"></script></body></html>`,
  });
}
