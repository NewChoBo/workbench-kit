/** @vitest-environment jsdom */

import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { useWorkbenchNativeContextMenuGuard } from './keyboard';
import {
  shouldAllowNativeBrowserContextMenu,
  suppressNativeBrowserContextMenu,
} from './workbenchContextMenu';

const testGlobal = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

function fixture(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.append(host);
  return host;
}

function contextMenu(target: EventTarget): MouseEvent {
  const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe('workbench native context menu policy', () => {
  it('preserves native input textarea and select menus', () => {
    const host = fixture('<input><textarea></textarea><select><option>Choice</option></select>');
    for (const element of Array.from(host.querySelectorAll('input, textarea, select, option'))) {
      expect(shouldAllowNativeBrowserContextMenu(element)).toBe(true);
    }
  });

  it('recognizes true empty and plaintext-only editing including descendant text targets', () => {
    const host = fixture(
      '<div contenteditable="true"><span>Rich text</span></div>' +
        '<div contenteditable><span>Empty attribute</span></div>' +
        '<div contenteditable="plaintext-only"><span>Plain text</span></div>',
    );
    for (const element of Array.from(host.querySelectorAll('div, span'))) {
      expect(shouldAllowNativeBrowserContextMenu(element)).toBe(true);
      expect(shouldAllowNativeBrowserContextMenu(element.firstChild)).toBe(true);
    }
  });

  it('inherits editing through missing and invalid contenteditable values', () => {
    const host = fixture(
      '<div contenteditable="TrUe"><section><span contenteditable="inherit">Text</span></section></div>',
    );
    expect(shouldAllowNativeBrowserContextMenu(host.querySelector('section'))).toBe(true);
    expect(shouldAllowNativeBrowserContextMenu(host.querySelector('span'))).toBe(true);
    const plain = fixture('<div contenteditable="invalid"><span>Chrome</span></div>');
    expect(shouldAllowNativeBrowserContextMenu(plain.querySelector('span'))).toBe(false);
  });

  it('respects false boundaries and nested editable overrides', () => {
    const host = fixture(
      '<div contenteditable="true"><section contenteditable="FaLsE">' +
        '<span>Chrome</span><p contenteditable="invalid">Inherited false</p>' +
        '<b contenteditable="plaintext-only"><i>Editable again</i></b></section></div>',
    );
    expect(shouldAllowNativeBrowserContextMenu(host.querySelector('section'))).toBe(false);
    expect(
      shouldAllowNativeBrowserContextMenu(host.querySelector('span')?.firstChild ?? null),
    ).toBe(false);
    expect(shouldAllowNativeBrowserContextMenu(host.querySelector('p'))).toBe(false);
    expect(shouldAllowNativeBrowserContextMenu(host.querySelector('i'))).toBe(true);
  });

  it('preserves the existing Monaco and CodeMirror editor areas', () => {
    const host = fixture(
      '<div class="monaco-editor"><span>Code</span></div>' +
        '<div class="workspace-editor__monaco"><span>Code</span></div>' +
        '<div class="cm-editor"><span>Code</span></div>',
    );
    for (const target of Array.from(host.querySelectorAll('span'))) {
      expect(shouldAllowNativeBrowserContextMenu(target)).toBe(true);
    }
  });

  it('honors explicit native opt-ins within noneditable content', () => {
    const host = fixture(
      '<div contenteditable="false"><section data-native-context-menu="true"><span>Native</span></section>' +
        '<input><b data-native-context-menu="false">Custom</b><i data-native-context-menu>Custom</i></div>',
    );
    expect(shouldAllowNativeBrowserContextMenu(host.querySelector('span'))).toBe(true);
    expect(shouldAllowNativeBrowserContextMenu(host.querySelector('input'))).toBe(true);
    expect(shouldAllowNativeBrowserContextMenu(host.querySelector('b'))).toBe(false);
    expect(shouldAllowNativeBrowserContextMenu(host.querySelector('i'))).toBe(false);
  });

  it('rejects ordinary chrome and non-node event targets', () => {
    const host = fixture('<button><span>Custom</span></button>');
    expect(shouldAllowNativeBrowserContextMenu(host.querySelector('span'))).toBe(false);
    expect(shouldAllowNativeBrowserContextMenu(null)).toBe(false);
    expect(shouldAllowNativeBrowserContextMenu(window)).toBe(false);
    expect(shouldAllowNativeBrowserContextMenu(document)).toBe(false);
    expect(shouldAllowNativeBrowserContextMenu(new EventTarget())).toBe(false);
  });

  it('applies the shared native policy through the shell event handler', async () => {
    const host = fixture('');
    root = createRoot(host);
    await act(async () => {
      root!.render(
        <div onContextMenu={suppressNativeBrowserContextMenu}>
          <input />
          <div contentEditable="plaintext-only" suppressContentEditableWarning>
            <span>Editable</span>
            <button contentEditable={false}>Chrome</button>
          </div>
          <div data-native-context-menu="true">Native</div>
        </div>,
      );
    });
    expect(contextMenu(host.querySelector('input')!).defaultPrevented).toBe(false);
    expect(contextMenu(host.querySelector('span')!.firstChild!).defaultPrevented).toBe(false);
    expect(contextMenu(host.querySelector('[data-native-context-menu]')!).defaultPrevented).toBe(
      false,
    );
    expect(contextMenu(host.querySelector('button')!).defaultPrevented).toBe(true);
  });

  it('shares the native policy in the global guard and removes its listener on unmount', async () => {
    function Guard() {
      useWorkbenchNativeContextMenuGuard();
      return null;
    }
    const targets = fixture(
      '<input><div contenteditable><span>Editable</span><b contenteditable="false">Chrome</b></div>' +
        '<div data-native-context-menu="true">Native</div><button>Custom</button>',
    );
    const host = fixture('');
    root = createRoot(host);
    await act(async () =>
      root!.render(
        <StrictMode>
          <Guard />
        </StrictMode>,
      ),
    );
    expect(contextMenu(targets.querySelector('input')!).defaultPrevented).toBe(false);
    expect(contextMenu(targets.querySelector('span')!.firstChild!).defaultPrevented).toBe(false);
    expect(contextMenu(targets.querySelector('[data-native-context-menu]')!).defaultPrevented).toBe(
      false,
    );
    expect(contextMenu(targets.querySelector('b')!).defaultPrevented).toBe(true);
    expect(contextMenu(targets.querySelector('button')!).defaultPrevented).toBe(true);

    await act(async () => root!.unmount());
    root = undefined;
    expect(contextMenu(targets.querySelector('button')!).defaultPrevented).toBe(false);
  });
});
