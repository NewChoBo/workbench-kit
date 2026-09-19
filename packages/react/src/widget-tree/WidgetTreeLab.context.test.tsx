/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createWidgetDocument,
  formatWidgetDocumentJson,
  getWidgetChildren,
} from '@workbench-kit/jdw';

import { WidgetTreeLab, type WidgetTreeLabProps } from './WidgetTreeLab.js';
import { WIDGET_TREE_DEMO_REGISTRY } from './demo-registry.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const source = formatWidgetDocumentJson({
  type: 'column',
  children: [
    { type: 'text', text: 'Alpha' },
    { type: 'text', text: 'Beta' },
    { type: 'column', children: [{ type: 'text', text: 'Nested' }] },
  ],
});

let root: Root;
let container: HTMLDivElement;
let props: WidgetTreeLabProps;
let currentSource: string;
let changes = vi.fn<(value: string) => void>();

async function mount(overrides: Partial<WidgetTreeLabProps> = {}) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  currentSource = source;
  changes = vi.fn<(value: string) => void>();
  props = {
    value: source,
    path: 'fixture.jdw.json',
    registry: WIDGET_TREE_DEMO_REGISTRY,
    showDesignSource: false,
    viewMode: 'design',
    onChange(value) {
      currentSource = value;
      changes(value);
      props = { ...props, value };
      root.render(<WidgetTreeLab {...props} />);
    },
    ...overrides,
  };
  await update({});
}

async function update(overrides: Partial<WidgetTreeLabProps>) {
  props = { ...props, ...overrides };
  await act(async () => root.render(<WidgetTreeLab {...props} />));
}

function element<T extends HTMLElement = HTMLElement>(selector: string): T {
  const result = container.querySelector<T>(selector);
  expect(result, selector).not.toBeNull();
  return result!;
}

function row(path = '$.children[1]') {
  return element(`[data-testid="widget-tree-node-${path}"]`);
}

function rowButton(path = '$.children[1]') {
  return row(path).querySelector<HTMLButtonElement>('.widget-tree-outline__button')!;
}

function menu() {
  return element('[role="menu"][aria-label="Widget actions"]');
}

function action(label: string) {
  const result = Array.from(menu().querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).find(
    (item) => item.textContent === label,
  );
  expect(result, label).toBeDefined();
  return result!;
}

async function fire(target: HTMLElement, event: Event) {
  await act(async () => {
    target.dispatchEvent(event);
  });
  return event;
}

async function context(target: HTMLElement) {
  return fire(
    target,
    new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 120,
      clientY: 160,
      button: 2,
    }),
  );
}

async function click(target: HTMLElement) {
  await act(async () => target.click());
}

async function key(target: HTMLElement, value: string, shiftKey = false) {
  return fire(
    target,
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: value, shiftKey }),
  );
}

function childrenText() {
  return getWidgetChildren(createWidgetDocument(currentSource).root!).map((child) => child.text);
}

describe('WidgetTreeLab context actions', () => {
  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('targets the right-clicked outline node without editing and restores focus on Escape', async () => {
    await mount();
    expect(row('$').getAttribute('aria-selected')).toBe('true');
    expect((await context(rowButton())).defaultPrevented).toBe(true);
    expect(row().getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(action('Edit properties'));
    expect(changes).not.toHaveBeenCalled();
    await key(menu(), 'Escape');
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(rowButton());
    expect(currentSource).toBe(source);
  });

  it('opens the targeted Inspector and edits that node through the existing controlled callback', async () => {
    await mount();
    await context(rowButton());
    await click(action('Edit properties'));
    const inspector = element('[data-testid="widget-tree-inspector-panel"]');
    expect(inspector.contains(document.activeElement)).toBe(true);
    const input = Array.from(inspector.querySelectorAll<HTMLInputElement>('input')).find(
      (candidate) => candidate.value === 'Beta',
    )!;
    expect(input).toBeDefined();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      input,
      'Edited Beta',
    );
    await fire(input, new Event('input', { bubbles: true }));
    expect(childrenText()).toEqual(['Alpha', 'Edited Beta', undefined]);
    expect(changes).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });

  it('keeps a later node menu focused after an earlier Inspector activation', async () => {
    await mount();
    await context(rowButton('$.children[0]'));
    await click(action('Edit properties'));
    const inspector = element('[data-testid="widget-tree-inspector-panel"]');
    expect(inspector.contains(document.activeElement)).toBe(true);

    await context(rowButton('$.children[1]'));
    expect(document.activeElement).toBe(action('Edit properties'));
    await key(document.activeElement as HTMLElement, 'ArrowDown');
    expect(document.activeElement).toBe(action('Move up'));
    await key(document.activeElement as HTMLElement, 'Escape');
    expect(document.activeElement).toBe(rowButton('$.children[1]'));

    await context(rowButton('$.children[1]'));
    expect(document.activeElement).toBe(action('Edit properties'));
    await key(document.activeElement as HTMLElement, 'Enter');
    expect(inspector.contains(document.activeElement)).toBe(true);
    expect(changes).not.toHaveBeenCalled();
  });

  it.each([
    ['Delete', 'Delete', false],
    ['Backspace', 'Backspace', false],
    ['Alt+ArrowUp', 'ArrowUp', true],
    ['Alt+ArrowDown', 'ArrowDown', true],
  ] satisfies [string, string, boolean][])(
    'does not apply %s to another selected node from a focused More button',
    async (_label, keyValue, altKey) => {
      await mount();
      await context(rowButton('$.children[1]'));
      await key(menu(), 'Escape');
      const more = element<HTMLButtonElement>('[data-testid="widget-tree-actions-$.children[0]"]');
      await act(async () => more.focus());
      expect(document.activeElement).toBe(more);
      await fire(
        more,
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: keyValue, altKey }),
      );
      expect(changes).not.toHaveBeenCalled();
      expect(currentSource).toBe(source);
      expect(document.activeElement).toBe(more);
      await click(more);
      expect(row('$.children[0]').getAttribute('aria-selected')).toBe('true');
      expect(document.activeElement).toBe(action('Edit properties'));
      await key(menu(), 'Escape');
      await key(rowButton('$.children[0]'), 'Delete');
      expect(changes).toHaveBeenCalledTimes(1);
      expect(childrenText()).toEqual(['Beta', undefined]);
    },
  );

  it('shares More and keyboard actions with the invoking row rectangle and no nested buttons', async () => {
    await mount();
    const more = element<HTMLButtonElement>('[data-testid="widget-tree-actions-$.children[1]"]');
    expect(more.closest('.widget-tree-outline__button')).toBeNull();
    const rect = {
      left: 44,
      bottom: 88,
      top: 60,
      right: 144,
      width: 100,
      height: 28,
      x: 44,
      y: 60,
      toJSON() {},
    };
    vi.spyOn(more, 'getBoundingClientRect').mockReturnValue(rect);
    const hostShortcut = vi.fn();
    container.addEventListener('keydown', hostShortcut, { once: true });
    const saveKey = await fire(
      more,
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 's',
        ctrlKey: true,
      }),
    );
    expect(hostShortcut).toHaveBeenCalledTimes(1);
    expect(saveKey.defaultPrevented).toBe(false);
    await key(more, 'Enter');
    expect(
      element('[data-testid="widget-tree-inspector-panel"]').contains(document.activeElement),
    ).toBe(false);
    await click(more);
    const labels = Array.from(menu().querySelectorAll('[role="menuitem"]')).map(
      (item) => item.textContent,
    );
    expect(menu().style.left).toBe('44px');
    expect(menu().style.top).toBe('88px');
    await key(menu(), 'Escape');
    const invoker = rowButton('$.children[0]');
    vi.spyOn(invoker, 'getBoundingClientRect').mockReturnValue({ ...rect, left: 72, bottom: 96 });
    for (const shortcut of ['F10', 'ContextMenu']) {
      await key(invoker, shortcut, shortcut === 'F10');
      expect(row('$.children[0]').getAttribute('aria-selected')).toBe('true');
      expect(menu().style.left).toBe('72px');
      expect(menu().style.top).toBe('96px');
      expect(
        Array.from(menu().querySelectorAll('[role="menuitem"]')).map((item) => item.textContent),
      ).toEqual(labels);
      await key(menu(), 'Escape');
    }
    expect(changes).not.toHaveBeenCalled();
  });

  it('moves only the targeted sibling once and keeps the moved node selected', async () => {
    await mount();
    await context(rowButton());
    await click(action('Move up'));
    expect(childrenText()).toEqual(['Beta', 'Alpha', undefined]);
    expect(changes).toHaveBeenCalledTimes(1);
    expect(row('$.children[0]').getAttribute('aria-selected')).toBe('true');
    await context(rowButton('$.children[0]'));
    expect(action('Move up').disabled).toBe(true);
    await click(action('Move down'));
    expect(childrenText()).toEqual(['Alpha', 'Beta', undefined]);
    expect(changes).toHaveBeenCalledTimes(2);
    await context(rowButton('$.children[2]'));
    expect(action('Move down').disabled).toBe(true);
  });

  it('protects the root and removes the targeted child once with parent selection', async () => {
    await mount();
    await context(rowButton('$'));
    for (const label of ['Move up', 'Move down', 'Remove node'])
      expect(action(label).disabled).toBe(true);
    await context(rowButton());
    await click(action('Remove node'));
    expect(childrenText()).toEqual(['Alpha', undefined]);
    expect(changes).toHaveBeenCalledTimes(1);
    expect(row('$').getAttribute('aria-selected')).toBe('true');
  });

  it('allows read-only inspection while disabling every mutation', async () => {
    await mount({ readOnly: true });
    await context(rowButton());
    expect(action('Inspect properties').disabled).toBe(false);
    for (const label of ['Move up', 'Move down', 'Remove node']) {
      expect(action(label).disabled).toBe(true);
      await click(action(label));
    }
    await click(action('Inspect properties'));
    expect(
      element('[data-testid="widget-tree-inspector-panel"]').contains(document.activeElement),
    ).toBe(true);
    expect(changes).not.toHaveBeenCalled();
  });

  it.each([
    ['replacement', { value: source.replace('Beta', 'Replacement') }],
    ['document path', { path: 'other.jdw.json' }],
    ['parse failure', { value: '{' }],
    ['mode', { viewMode: 'code' }],
    ['permission', { readOnly: true }],
  ] satisfies [string, Partial<WidgetTreeLabProps>][])(
    'invalidates an open menu on %s before a stale action can edit',
    async (_reason, change) => {
      await mount();
      await context(rowButton());
      const staleButton = action('Remove node');
      await update(change);
      expect(container.querySelector('[role="menu"]')).toBeNull();
      await click(staleButton);
      await update({
        value: source,
        path: 'fixture.jdw.json',
        viewMode: 'design',
        readOnly: false,
      });
      expect(container.querySelector('[role="menu"]')).toBeNull();
      expect(changes).not.toHaveBeenCalled();
    },
  );

  it('targets the nearest authored canvas node for pointer and keyboard requests without a drag', async () => {
    await mount();
    const target = element('[data-layout-node][data-widget-path="$.children[2].children[0]"]');
    await context(target);
    expect(row('$.children[2].children[0]').getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('[data-testid="widget-tree-canvas-drag-preview"]')).toBeNull();
    await key(menu(), 'Escape');
    expect(document.activeElement).toBe(target);
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ left: 90, bottom: 110 } as DOMRect);
    await key(target, 'F10', true);
    expect(menu().style.left).toBe('90px');
    expect(menu().style.top).toBe('110px');
    await click(action('Edit properties'));
    expect(
      element('[data-testid="widget-tree-inspector-panel"]').contains(document.activeElement),
    ).toBe(true);
    expect(changes).not.toHaveBeenCalled();
  });

  it('preserves native editable context menus and ignores unowned canvas paths', async () => {
    await mount();
    const target = element('[data-layout-node][data-widget-path="$.children[1]"]');
    const input = document.createElement('input');
    input.value = 'native selection';
    target.append(input);
    input.focus();
    input.setSelectionRange(1, 5);
    expect((await context(input)).defaultPrevented).toBe(false);
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(1);
    const unknown = document.createElement('div');
    unknown.dataset.widgetPath = '$.children[1].children[0]';
    target.append(unknown);
    expect((await context(unknown)).defaultPrevented).toBe(false);
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(changes).not.toHaveBeenCalled();
  });

  it('does not retarget an expanded reference child to an authored ancestor', async () => {
    const refSource = formatWidgetDocumentJson({
      type: 'column',
      children: [{ type: 'ref', path: './part.jdw.json' }],
    });
    await mount({
      value: refSource,
      loadDocument: () =>
        formatWidgetDocumentJson({
          type: 'column',
          children: [{ type: 'text', text: 'Imported child' }],
        }),
    });
    const imported = element('[data-layout-node][data-widget-path="$.children[0].children[0]"]');
    expect((await context(imported)).defaultPrevented).toBe(false);
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(row('$').getAttribute('aria-selected')).toBe('true');
    await context(element('[data-layout-node][data-widget-path="$.children[0]"]'));
    expect(row('$.children[0]').getAttribute('aria-selected')).toBe('true');
    expect(action('Edit properties').disabled).toBe(false);
    expect(changes).not.toHaveBeenCalled();
  });

  it('does not start a resize or drag from a secondary pointer on canvas chrome', async () => {
    await mount({
      value: formatWidgetDocumentJson({
        type: 'stack',
        width: 300,
        height: 200,
        children: [{ type: 'text', text: 'Movable', left: 20, top: 20, width: 80, height: 40 }],
      }),
    });
    await context(rowButton('$.children[0]'));
    await key(menu(), 'Escape');
    for (const selector of [
      'widget-tree-canvas-drag-handle',
      'widget-tree-canvas-resize-handle-se',
    ]) {
      const handle = element(`[data-testid="${selector}"]`);
      for (const type of ['pointerdown', 'pointermove', 'pointerup']) {
        await fire(
          handle,
          new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            button: 2,
            clientX: 140,
            clientY: 160,
          }),
        );
      }
      await context(handle);
      expect(action('Edit properties').disabled).toBe(false);
      await key(menu(), 'Escape');
      expect(document.activeElement).toBe(
        element('[data-layout-node][data-widget-path="$.children[0]"]'),
      );
    }
    expect(changes).not.toHaveBeenCalled();
  });
});
