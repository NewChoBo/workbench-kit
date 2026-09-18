import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { registerHooks } from 'node:module';
import { JSDOM, VirtualConsole } from 'jsdom';

const [entry, vendor] = process.argv.slice(2);
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (error) => errors.push(error));
const dom = new JSDOM(fs.readFileSync(path.join(path.dirname(entry), 'index.html'), 'utf8'), {
  url: 'http://127.0.0.1/',
  pretendToBeVisual: true,
  virtualConsole,
});
for (const name of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLFormElement',
  'Node',
  'Element',
  'SVGElement',
  'Document',
  'DocumentFragment',
  'Text',
  'Comment',
  'Event',
  'InputEvent',
  'CompositionEvent',
  'CustomEvent',
  'MutationObserver',
  'FormData',
  'getComputedStyle',
]) {
  Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
}
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier === '/vendor/native-text-input.js' ? pathToFileURL(vendor).href : specifier,
      context,
    );
  },
});

try {
  await import(pathToFileURL(entry).href);
  if (!dom.window.nativeInputFixture?.ready) throw new Error('Fixture did not start its matrix');
  const summary = await dom.window.nativeInputFixture.ready;
  if (errors.length) throw new AggregateError(errors, 'Unhandled DOM errors');
  dom.window.close();
  process.stdout.write(`${JSON.stringify(summary)}\n`, () => process.exit(0));
} catch (error) {
  dom.window.close();
  console.error(error);
  process.exit(1);
}
