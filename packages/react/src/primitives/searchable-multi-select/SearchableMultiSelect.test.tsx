/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchableMultiSelect } from './SearchableMultiSelect';
import {
  SEARCHABLE_MULTI_SELECT_LISTBOX_ATTR,
  isSearchableMultiSelectPortalTarget,
} from './overlay';

const options = [
  { label: 'Action', value: 'action', count: 12 },
  { label: 'Adventure', value: 'adventure', count: 8 },
  { label: 'No value', value: '__no_value__', count: 3 },
];

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

function stubVisibleRect(element: Element): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: 16,
      y: 80,
      top: 80,
      left: 16,
      bottom: 106,
      right: 296,
      width: 280,
      height: 26,
      toJSON: () => ({}),
    }),
  });
  Object.defineProperty(element, 'checkVisibility', {
    configurable: true,
    value: () => true,
  });
}

describe('SearchableMultiSelect', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('renders selected chips and a closed combobox input', () => {
    const markup = renderToStaticMarkup(
      <SearchableMultiSelect
        aria-label="Genre"
        onValueToggle={() => undefined}
        options={options}
        searchPlaceholder="Search genres"
        selectedValues={['action', '__no_value__']}
      />,
    );

    expect(markup).toContain('data-ui-searchable-multi-select="true"');
    expect(markup).toContain('role="combobox"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('Search genres');
    expect(markup).toContain('data-ui-searchable-multi-select-chip="action"');
    expect(markup).toContain('data-ui-searchable-multi-select-chip="__no_value__"');
    expect(markup).toContain('Action');
    expect(markup).toContain('No value');
    expect(markup).not.toContain('role="listbox"');
  });

  it('re-exports from primitives entry without import cycle', async () => {
    const entry = await import('..');
    const module = await import('./index');

    expect(entry.SearchableMultiSelect).toBe(module.SearchableMultiSelect);
    expect(entry.isSearchableMultiSelectPortalTarget).toBe(
      module.isSearchableMultiSelectPortalTarget,
    );
  });

  it('marks the portaled listbox so host outside-click can treat it as inside', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const onValueToggle = vi.fn();

    await act(async () => {
      root.render(
        <SearchableMultiSelect
          aria-label="Genre"
          onValueToggle={onValueToggle}
          options={options}
          selectedValues={[]}
        />,
      );
    });

    const input = container.querySelector<HTMLInputElement>('input[role="combobox"]');
    expect(input).not.toBeNull();
    stubVisibleRect(input!);

    await act(async () => {
      input?.focus();
    });

    const listbox = document.querySelector<HTMLElement>(
      `[${SEARCHABLE_MULTI_SELECT_LISTBOX_ATTR}="true"]`,
    );
    expect(listbox).not.toBeNull();
    expect(listbox?.getAttribute('role')).toBe('listbox');
    expect(listbox?.classList.contains('ui-workbench-scrollbar')).toBe(true);
    expect(container.contains(listbox)).toBe(false);

    const option = document.querySelector<HTMLButtonElement>(
      '[data-ui-searchable-multi-select-option="action"]',
    );
    expect(option).not.toBeNull();
    expect(isSearchableMultiSelectPortalTarget(option)).toBe(true);

    await act(async () => {
      option?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onValueToggle).toHaveBeenCalledWith('action');

    await act(async () => {
      root.unmount();
    });
  });

  it('keeps a host popover open when pointerdown lands on the portaled listbox', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const onValueToggle = vi.fn();
    let panelOpen = true;

    const dismiss = (event: PointerEvent) => {
      const panel = document.querySelector('[data-testid="filter-panel"]');
      const target = event.target as Node;
      if (panel?.contains(target)) {
        return;
      }
      if (isSearchableMultiSelectPortalTarget(event.target)) {
        return;
      }
      panelOpen = false;
    };

    window.addEventListener('pointerdown', dismiss, true);

    await act(async () => {
      root.render(
        <div data-testid="filter-panel">
          <SearchableMultiSelect
            aria-label="Genre"
            onValueToggle={onValueToggle}
            options={options}
            selectedValues={[]}
          />
        </div>,
      );
    });

    const input = container.querySelector<HTMLInputElement>('input[role="combobox"]');
    expect(input).not.toBeNull();
    stubVisibleRect(input!);

    await act(async () => {
      input?.focus();
    });

    const option = document.querySelector<HTMLButtonElement>(
      '[data-ui-searchable-multi-select-option="adventure"]',
    );
    expect(option).not.toBeNull();

    await act(async () => {
      option?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      option?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(panelOpen).toBe(true);
    expect(onValueToggle).toHaveBeenCalledWith('adventure');

    window.removeEventListener('pointerdown', dismiss, true);
    await act(async () => {
      root.unmount();
    });
  });
});
