/** @vitest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { userEvent } from 'storybook/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WidgetRegistryContract } from '@workbench-kit/contracts';

import { renderJdw } from '../renderJdw.js';
import { createKitJdwRegistry } from './createKitJdwRegistry.js';
import type { KitJdwAction, KitJdwHostPort, KitJdwHostSnapshot } from './contracts.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots = new Set<Root>();
const containers = new Set<HTMLDivElement>();
const buttonSource = JSON.stringify({
  type: 'kit.button.v1',
  args: { label: 'Open', actionKey: 'open' },
});
const mediaSource = JSON.stringify({
  type: 'kit.media-slot.v1',
  args: { resourceKey: 'cover', alt: 'Record cover' },
});
const allSource = JSON.stringify({
  type: 'row',
  args: {
    children: [
      { type: 'kit.button.v1', args: { label: 'Open', actionKey: 'open' } },
      { type: 'kit.icon-button.v1', args: { label: 'More', icon: 'more', actionKey: 'more' } },
      { type: 'kit.media-slot.v1', args: { resourceKey: 'cover', alt: 'Record cover' } },
    ],
  },
});

function createHost() {
  let snapshot: KitJdwHostSnapshot = Object.freeze({ mode: 'live', contextKey: Object.freeze({}) });
  const run = vi.fn<() => void | Promise<void>>();
  let action: unknown = Object.freeze({ state: 'ready', run });
  let resource: unknown = { imageUrl: 'https://example.invalid/cover-one.png' };
  const listeners = new Set<() => void>();
  const cleanup = vi.fn();
  const host = {
    subscribe: vi.fn((listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        cleanup();
      };
    }),
    getSnapshot: vi.fn(() => snapshot),
    getAction: vi.fn((_key: string, _contextKey: object) => action as KitJdwAction | undefined),
    resolveMedia: vi.fn(
      (_key: string, _contextKey: object) => resource as ReturnType<KitJdwHostPort['resolveMedia']>,
    ),
    onActionError: vi.fn<(error: unknown) => void>(),
  } satisfies KitJdwHostPort;
  const emit = () =>
    act(() => {
      for (const listener of listeners) listener();
    });
  return {
    host,
    run,
    listeners,
    cleanup,
    emit,
    current: () => snapshot,
    snapshot(next: KitJdwHostSnapshot, notify = true) {
      snapshot = Object.freeze(next);
      if (notify) emit();
    },
    action(next: unknown, notify = true) {
      action = next;
      snapshot = Object.freeze({ ...snapshot });
      if (notify) emit();
    },
    resource(next: unknown, notify = true) {
      resource = next;
      snapshot = Object.freeze({ ...snapshot });
      if (notify) emit();
    },
  };
}

function mount(node: ReactNode) {
  const container = document.createElement('div');
  document.body.append(container);
  containers.add(container);
  const root = createRoot(container);
  roots.add(root);
  act(() => root.render(node));
  return {
    container,
    rerender(next: ReactNode) {
      act(() => root.render(next));
    },
    unmount() {
      act(() => root.unmount());
      roots.delete(root);
    },
  };
}

function render(source: string, registry: WidgetRegistryContract): ReactNode {
  return renderJdw(source, {
    registry,
    strictKnownTypes: true,
    layoutConstraints: { minWidth: 0, maxWidth: 600, minHeight: 0, maxHeight: 200 },
  });
}

function button(container: HTMLElement): HTMLButtonElement {
  const element = container.querySelector('button');
  expect(element).not.toBeNull();
  return element!;
}

function click(element: HTMLElement): void {
  act(() => element.click());
}

afterEach(() => {
  for (const root of roots) act(() => root.unmount());
  roots.clear();
  for (const container of containers) container.remove();
  containers.clear();
  vi.restoreAllMocks();
});

describe('host-owned action availability and current identity', () => {
  it('disables no-host and missing-key leaves without executing callbacks', () => {
    const withoutHost = mount(render(buttonSource, createKitJdwRegistry()));
    expect(button(withoutHost.container).disabled).toBe(true);
    const store = createHost();
    const source = '{"type":"kit.button.v1","args":{"label":"No action"}}';
    const view = mount(render(source, createKitJdwRegistry({ host: store.host })));
    expect(button(view.container).disabled).toBe(true);
    click(button(view.container));
    expect(store.host.getAction).not.toHaveBeenCalled();
    expect(store.run).not.toHaveBeenCalled();
  });

  it.each(['disabled', 'busy', 'denied', 'missing'] as const)(
    'blocks the %s capability state',
    (state) => {
      const store = createHost();
      store.action(state === 'missing' ? undefined : { state, run: store.run });
      const view = mount(render(allSource, createKitJdwRegistry({ host: store.host })));
      for (const element of Array.from(view.container.querySelectorAll('button'))) {
        expect(element.disabled).toBe(true);
        click(element);
      }
      expect(store.run).not.toHaveBeenCalled();
    },
  );

  it('uses JSON disabled only to further restrict an available live capability', () => {
    const store = createHost();
    const source =
      '{"type":"kit.button.v1","args":{"label":"Open","actionKey":"open","disabled":true}}';
    const view = mount(render(source, createKitJdwRegistry({ host: store.host })));
    expect(button(view.container).disabled).toBe(true);
    click(button(view.container));
    expect(store.run).not.toHaveBeenCalled();
    store.action({ state: 'denied', run: store.run });
    view.rerender(render(buttonSource, createKitJdwRegistry({ host: store.host })));
    expect(button(view.container).disabled).toBe(true);
  });

  it('subscribes once per reactive leaf and re-renders live state without registry reconstruction', () => {
    const store = createHost();
    const registry = createKitJdwRegistry({ host: store.host });
    const view = mount(render(allSource, registry));
    expect(store.listeners.size).toBe(3);
    const build = registry.get('kit.button.v1');
    expect(button(view.container).disabled).toBe(false);
    store.action({ state: 'busy', run: store.run });
    expect(button(view.container).disabled).toBe(true);
    store.action({ state: 'ready', run: store.run });
    expect(button(view.container).disabled).toBe(false);
    store.snapshot({ ...store.current(), mode: 'preview' });
    expect(button(view.container).disabled).toBe(true);
    expect(registry.get('kit.button.v1')).toBe(build);
    expect(store.host.subscribe).toHaveBeenCalledTimes(3);
    view.unmount();
    expect(store.listeners.size).toBe(0);
    expect(store.cleanup).toHaveBeenCalledTimes(3);
  });

  it('calls a ready host-bound action exactly once without a JSON payload', () => {
    const store = createHost();
    const view = mount(render(buttonSource, createKitJdwRegistry({ host: store.host })));
    click(button(view.container));
    expect(store.run).toHaveBeenCalledExactlyOnceWith();
    expect(store.host.getAction).toHaveBeenLastCalledWith('open', store.current().contextKey);
  });

  it.each(['preview', 'busy', 'denied', 'revoked', 'context'] as const)(
    'blocks %s changes after render but before activation, without a notification',
    (change) => {
      const store = createHost();
      const view = mount(render(buttonSource, createKitJdwRegistry({ host: store.host })));
      expect(button(view.container).disabled).toBe(false);
      if (change === 'context') store.snapshot({ mode: 'live', contextKey: {} }, false);
      else if (change === 'preview') store.snapshot({ ...store.current(), mode: 'preview' }, false);
      else
        store.action(change === 'revoked' ? undefined : { state: change, run: store.run }, false);
      click(button(view.container));
      expect(store.run).not.toHaveBeenCalled();
    },
  );

  it('uses the newest same-context callback and never executes a former record callback', () => {
    const store = createHost();
    const registry = createKitJdwRegistry({ host: store.host });
    const view = mount(render(buttonSource, registry));
    const nextRun = vi.fn();
    store.action({ state: 'ready', run: nextRun }, false);
    click(button(view.container));
    expect(nextRun).toHaveBeenCalledTimes(1);
    expect(store.run).not.toHaveBeenCalled();
    store.snapshot({ mode: 'live', contextKey: {} }, false);
    click(button(view.container));
    expect(nextRun).toHaveBeenCalledTimes(1);
    store.emit();
    expect(button(view.container).disabled).toBe(true);
    click(button(view.container));
    expect(nextRun).toHaveBeenCalledTimes(1);
    view.rerender(render(buttonSource, registry));
    expect(button(view.container).disabled).toBe(false);
    click(button(view.container));
    expect(nextRun).toHaveBeenCalledTimes(2);
  });

  it('lets the host synchronous busy claim block a rapid second event', () => {
    const store = createHost();
    store.run.mockImplementation(() => {
      store.action({ state: 'busy', run: store.run }, false);
    });
    const view = mount(render(buttonSource, createKitJdwRegistry({ host: store.host })));
    act(() => {
      button(view.container).click();
      button(view.container).click();
    });
    expect(store.run).toHaveBeenCalledTimes(1);
  });

  it('fails closed if capability selection changes context while an activation is being checked', () => {
    const store = createHost();
    const view = mount(render(buttonSource, createKitJdwRegistry({ host: store.host })));
    store.host.getAction.mockImplementationOnce(() => {
      store.snapshot({ mode: 'live', contextKey: {} }, false);
      return { state: 'ready', run: store.run };
    });
    click(button(view.container));
    expect(store.run).not.toHaveBeenCalled();
  });

  it('contains thrown selectors and malformed action output', () => {
    const store = createHost();
    const registry = createKitJdwRegistry({ host: store.host });
    store.host.getAction.mockImplementation(() => {
      throw new Error('Unavailable');
    });
    const view = mount(render(buttonSource, registry));
    expect(button(view.container).disabled).toBe(true);
    for (const action of [{ state: 'ready' }, { state: 'unknown', run: store.run }, [], null]) {
      store.host.getAction.mockImplementation(() => action as unknown as KitJdwAction);
      store.snapshot({ ...store.current() });
      expect(button(view.container).disabled).toBe(true);
    }
    expect(store.run).not.toHaveBeenCalled();
  });

  it('contains synchronous and rejected action failures, including a throwing error reporter', async () => {
    const store = createHost();
    const view = mount(render(buttonSource, createKitJdwRegistry({ host: store.host })));
    const error = new Error('Action failed');
    store.run.mockImplementationOnce(() => {
      throw error;
    });
    click(button(view.container));
    expect(store.host.onActionError).toHaveBeenCalledExactlyOnceWith(error);
    store.run.mockImplementationOnce(() => Promise.reject(error));
    await act(async () => {
      button(view.container).click();
      await Promise.resolve();
    });
    expect(store.host.onActionError).toHaveBeenCalledTimes(2);
    store.host.onActionError.mockImplementation(() => {
      throw new Error('Reporter failed');
    });
    store.run.mockImplementationOnce(() => {
      throw error;
    });
    expect(() => click(button(view.container))).not.toThrow();
    store.host.onActionError.mockImplementation(() =>
      Promise.reject(new Error('Reporter rejected')),
    );
    store.run.mockImplementationOnce(() => Promise.reject(error));
    await act(async () => {
      button(view.container).click();
      await Promise.resolve();
    });
    expect(store.run).toHaveBeenCalledTimes(4);
  });

  it('allows an async action to finish after unmount without adapter-owned state updates', async () => {
    const store = createHost();
    let finish!: () => void;
    store.run.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const view = mount(render(buttonSource, createKitJdwRegistry({ host: store.host })));
    click(button(view.container));
    expect(button(view.container).disabled).toBe(false);
    view.unmount();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await act(async () => {
      finish();
      await Promise.resolve();
    });
    expect(error).not.toHaveBeenCalled();
    expect(store.listeners.size).toBe(0);
    expect(store.host.onActionError).not.toHaveBeenCalled();
  });
});

describe('fail-closed host snapshots and lifecycle', () => {
  it.each([
    null,
    {},
    { mode: 'editing', contextKey: {} },
    { mode: 'live', contextKey: null },
    { mode: 'live', contextKey: 'record-id' },
    { mode: 'live', contextKey: () => undefined },
  ])(
    'uses a stable unavailable fallback for malformed snapshot %o without a React loop',
    (snapshot) => {
      const store = createHost();
      store.host.getSnapshot.mockImplementation(() => snapshot as KitJdwHostSnapshot);
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const view = mount(render(allSource, createKitJdwRegistry({ host: store.host })));
      for (let index = 0; index < 3; index++) store.emit();
      expect(button(view.container).disabled).toBe(true);
      expect(view.container.querySelector('img')).toBeNull();
      expect(store.host.getAction).not.toHaveBeenCalled();
      expect(store.host.resolveMedia).not.toHaveBeenCalled();
      expect(store.host.getSnapshot.mock.calls.length).toBeLessThan(100);
      expect(error).not.toHaveBeenCalled();
    },
  );

  it('contains snapshot exceptions and can bind a recovered snapshot on explicit recomposition', () => {
    const store = createHost();
    store.host.getSnapshot.mockImplementation(() => {
      throw new Error('Snapshot failed');
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const registry = createKitJdwRegistry({ host: store.host });
    const view = mount(render(allSource, registry));
    store.emit();
    expect(button(view.container).disabled).toBe(true);
    expect(store.host.getAction).not.toHaveBeenCalled();
    expect(store.host.resolveMedia).not.toHaveBeenCalled();
    store.host.getSnapshot.mockImplementation(store.current);
    store.emit();
    expect(button(view.container).disabled).toBe(true);
    expect(view.container.querySelector('img')).toBeNull();
    view.rerender(render(allSource, registry));
    expect(button(view.container).disabled).toBe(false);
    expect(view.container.querySelector('img')).not.toBeNull();
    expect(error).not.toHaveBeenCalled();
  });

  it.each(['throws', 'invalid-cleanup'] as const)(
    'quarantines a port whose subscribe %s until a new registry is made',
    (failure) => {
      const store = createHost();
      let retainedListener: (() => void) | undefined;
      store.host.subscribe.mockImplementation((listener) => {
        retainedListener = listener;
        if (failure === 'throws') throw new Error('Subscribe failed');
        return undefined as unknown as () => void;
      });
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const registry = createKitJdwRegistry({ host: store.host });
      const view = mount(render(allSource, registry));
      expect(button(view.container).disabled).toBe(true);
      expect(view.container.querySelector('img')).toBeNull();
      const actionReads = store.host.getAction.mock.calls.length;
      const resourceReads = store.host.resolveMedia.mock.calls.length;
      act(() => retainedListener?.());
      click(button(view.container));
      expect(store.host.getAction).toHaveBeenCalledTimes(actionReads);
      expect(store.host.resolveMedia).toHaveBeenCalledTimes(resourceReads);
      expect(store.run).not.toHaveBeenCalled();
      store.host.subscribe.mockImplementation(() => () => undefined);
      view.rerender(render(allSource, registry));
      expect(button(view.container).disabled).toBe(true);
      view.unmount();
      const recovered = mount(render(allSource, createKitJdwRegistry({ host: store.host })));
      expect(button(recovered.container).disabled).toBe(false);
      expect(error).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['action', 'throws'],
    ['action', 'invalid-cleanup'],
    ['media', 'throws'],
    ['media', 'invalid-cleanup'],
  ] as const)(
    'retires an existing %s leaf when a later subscription %s without host emission',
    (kind, failure) => {
      const store = createHost();
      const retained: Array<() => void> = [];
      const cleanups: Array<ReturnType<typeof vi.fn>> = [];
      store.host.subscribe.mockImplementation((listener) => {
        retained.push(listener);
        if (retained.length === 2) {
          if (failure === 'throws') throw new Error('Later subscription failed');
          return undefined as unknown as () => void;
        }
        const cleanup = vi.fn(() => listener());
        cleanups.push(cleanup);
        return cleanup;
      });
      const registry = createKitJdwRegistry({ host: store.host });
      const first = mount(render(kind === 'action' ? buttonSource : mediaSource, registry));
      if (kind === 'action') expect(button(first.container).disabled).toBe(false);
      else expect(first.container.querySelector('img')).not.toBeNull();
      const second = mount(render(buttonSource, registry));
      expect(button(second.container).disabled).toBe(true);
      if (kind === 'action') expect(button(first.container).disabled).toBe(true);
      else expect(first.container.querySelector('img')).toBeNull();
      expect(cleanups).toHaveLength(1);
      expect(cleanups[0]).toHaveBeenCalledTimes(1);
      const snapshotReads = store.host.getSnapshot.mock.calls.length;
      act(() => retained.forEach((listener) => listener()));
      expect(store.host.getSnapshot).toHaveBeenCalledTimes(snapshotReads);
      expect(store.run).not.toHaveBeenCalled();
      first.unmount();
      second.unmount();
      expect(cleanups[0]).toHaveBeenCalledTimes(1);
    },
  );

  it('contains cleanup exceptions during unmount', () => {
    const store = createHost();
    store.host.subscribe.mockImplementation(() => () => {
      throw new Error('Cleanup failed');
    });
    const view = mount(render(buttonSource, createKitJdwRegistry({ host: store.host })));
    expect(() => view.unmount()).not.toThrow();
  });

  it('retires a retained host listener before cleanup and ignores post-unmount notifications', () => {
    const store = createHost();
    let retainedListener!: () => void;
    store.host.subscribe.mockImplementation((listener) => {
      retainedListener = listener;
      return () => {
        listener();
      };
    });
    const view = mount(render(buttonSource, createKitJdwRegistry({ host: store.host })));
    view.unmount();
    const snapshotReads = store.host.getSnapshot.mock.calls.length;
    act(() => retainedListener());
    expect(store.host.getSnapshot).toHaveBeenCalledTimes(snapshotReads);
  });

  it('does not invoke snapshot or capability accessor properties', () => {
    const snapshotGetter = vi.fn(() => 'live');
    const store = createHost();
    const snapshot = Object.defineProperty({ contextKey: {} }, 'mode', {
      get: snapshotGetter,
      enumerable: true,
    });
    store.host.getSnapshot.mockImplementation(() => snapshot as KitJdwHostSnapshot);
    const first = mount(render(allSource, createKitJdwRegistry({ host: store.host })));
    expect(button(first.container).disabled).toBe(true);
    expect(snapshotGetter).not.toHaveBeenCalled();
    first.unmount();
    store.host.getSnapshot.mockImplementation(store.current);
    const actionGetter = vi.fn(() => 'ready');
    const resourceGetter = vi.fn(() => 'https://example.invalid/hidden.png');
    store.action(
      Object.defineProperty({ run: store.run }, 'state', {
        get: actionGetter,
        enumerable: true,
      }),
    );
    store.resource(
      Object.defineProperty({}, 'imageUrl', {
        get: resourceGetter,
        enumerable: true,
      }),
    );
    const second = mount(render(allSource, createKitJdwRegistry({ host: store.host })));
    expect(button(second.container).disabled).toBe(true);
    expect(second.container.querySelector('img')).toBeNull();
    expect(actionGetter).not.toHaveBeenCalled();
    expect(resourceGetter).not.toHaveBeenCalled();
  });

  it('uses the available host server snapshot but never subscribes or invokes actions during SSR', () => {
    const store = createHost();
    const output = renderToStaticMarkup(
      <>{render(allSource, createKitJdwRegistry({ host: store.host }))}</>,
    );
    expect(output).toContain('ui-button');
    expect(output).toContain('https://example.invalid/cover-one.png');
    expect(store.host.getSnapshot).toHaveBeenCalled();
    expect(store.host.subscribe).not.toHaveBeenCalled();
    expect(store.run).not.toHaveBeenCalled();
    expect(renderToStaticMarkup(<>{render(allSource, createKitJdwRegistry())}</>)).toContain(
      'disabled=""',
    );
  });
});

describe('ephemeral media capabilities and primitive-owned fallback', () => {
  it('resolves only the opaque key and current context without changing serialized source or metadata', () => {
    const store = createHost();
    const registry = createKitJdwRegistry({ host: store.host });
    const before = JSON.stringify(
      registry
        .definitions()
        .map(({ componentDescriptor, schema }) => ({ componentDescriptor, schema })),
    );
    const view = mount(render(mediaSource, registry));
    expect(view.container.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.invalid/cover-one.png',
    );
    expect(view.container.querySelector('img')?.alt).toBe('Record cover');
    expect(store.host.resolveMedia).toHaveBeenLastCalledWith('cover', store.current().contextKey);
    expect(mediaSource).not.toContain('https:');
    expect(before).not.toContain('https:');
    expect(
      JSON.stringify(
        registry
          .definitions()
          .map(({ componentDescriptor, schema }) => ({ componentDescriptor, schema })),
      ),
    ).toBe(before);
  });

  it.each([
    undefined,
    null,
    {},
    { imageUrl: '' },
    { imageUrl: ' ' },
    { imageUrl: 123 },
    { imageUrl: 'bad\nurl' },
  ])('uses a noninteractive accessible fallback for missing or malformed media %o', (resource) => {
    const store = createHost();
    store.resource(resource);
    const view = mount(render(mediaSource, createKitJdwRegistry({ host: store.host })));
    expect(view.container.querySelector('img')).toBeNull();
    expect(view.container.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
      'Record cover',
    );
    expect(view.container.querySelector('button, a, [tabindex]')).toBeNull();
  });

  it('contains resolver failures and keeps empty-alt fallback decorative', () => {
    const store = createHost();
    store.host.resolveMedia.mockImplementation(() => {
      throw new Error('Resource unavailable');
    });
    const source = '{"type":"kit.media-slot.v1","args":{"resourceKey":"cover","alt":""}}';
    const view = mount(render(source, createKitJdwRegistry({ host: store.host })));
    expect(view.container.querySelector('img, [role="img"]')).toBeNull();
    expect(
      view.container.querySelector('.ui-workbench-media-slot [aria-hidden="true"]'),
    ).not.toBeNull();
  });

  it('removes revoked URLs on same-context and changed-context host updates without a registry rebuild', () => {
    const store = createHost();
    const registry = createKitJdwRegistry({ host: store.host });
    const view = mount(render(mediaSource, registry));
    store.resource(undefined);
    expect(view.container.querySelector('img')).toBeNull();
    store.resource({ imageUrl: 'https://example.invalid/cover-two.png' });
    expect(view.container.querySelector('img')?.getAttribute('src')).toContain('cover-two.png');
    store.resource({ imageUrl: 'https://example.invalid/new-context.png' }, false);
    store.snapshot({ mode: 'live', contextKey: {} });
    expect(view.container.querySelector('img')).toBeNull();
    expect(view.container.innerHTML).not.toContain('cover-two.png');
    expect(view.container.innerHTML).not.toContain('new-context.png');
    view.rerender(render(mediaSource, registry));
    expect(view.container.querySelector('img')?.getAttribute('src')).toContain('new-context.png');
  });

  it('delegates image errors and changed-URL recovery to WorkbenchMediaSlot', () => {
    const store = createHost();
    const view = mount(render(mediaSource, createKitJdwRegistry({ host: store.host })));
    const image = view.container.querySelector('img')!;
    act(() => image.dispatchEvent(new Event('error')));
    expect(view.container.querySelector('img')).toBeNull();
    expect(view.container.querySelector('[role="img"]')).not.toBeNull();
    store.resource({ imageUrl: 'https://example.invalid/recovered.png' });
    expect(view.container.querySelector('img')?.getAttribute('src')).toContain('recovered.png');
  });

  it('discards a resource selected while its context changes', () => {
    const store = createHost();
    store.host.resolveMedia.mockImplementationOnce(() => {
      store.snapshot({ mode: 'live', contextKey: {} }, false);
      return { imageUrl: 'https://example.invalid/stale-context.png' };
    });
    const view = mount(render(mediaSource, createKitJdwRegistry({ host: store.host })));
    expect(view.container.querySelector('img')).toBeNull();
    expect(view.container.innerHTML).not.toContain('stale-context.png');
  });
});

describe('native button keyboard and preview selection behavior', () => {
  it('tabs to native Button and IconButton and activates once per Enter or Space with selection off', async () => {
    const store = createHost();
    const view = mount(render(allSource, createKitJdwRegistry({ host: store.host })));
    const buttons = view.container.querySelectorAll('button');
    const user = userEvent.setup({ document });
    await act(async () => {
      await user.tab();
    });
    expect(document.activeElement).toBe(buttons[0]);
    await act(async () => {
      await user.keyboard('{Enter}');
    });
    expect(store.run).toHaveBeenCalledTimes(1);
    await act(async () => {
      await user.keyboard(' ');
    });
    expect(store.run).toHaveBeenCalledTimes(2);
    await act(async () => {
      await user.tab();
    });
    expect(document.activeElement).toBe(buttons[1]);
    expect(buttons[1]?.getAttribute('aria-label')).toBe('More');
    await act(async () => {
      await user.keyboard('{Enter} ');
    });
    expect(store.run).toHaveBeenCalledTimes(4);
    expect(
      view.container.querySelector('button button, [data-widget-interactive="true"]'),
    ).toBeNull();
  });

  it('excludes disabled controls from tab focus and native activation', async () => {
    const store = createHost();
    store.action({ state: 'denied', run: store.run });
    const view = mount(render(allSource, createKitJdwRegistry({ host: store.host })));
    const user = userEvent.setup({ document });
    await act(async () => {
      await user.tab();
      await user.keyboard('{Enter} ');
    });
    expect(view.container.contains(document.activeElement)).toBe(false);
    expect(store.run).not.toHaveBeenCalled();
  });

  it('keeps preview actions disabled when the existing selection wrapper consumes keyboard activation', async () => {
    const store = createHost();
    store.snapshot({ ...store.current(), mode: 'preview' });
    const select = vi.fn();
    const view = mount(
      renderJdw(buttonSource, {
        registry: createKitJdwRegistry({ host: store.host }),
        selectedPath: [],
        onSelectPath: select,
      }),
    );
    const wrapper = view.container.querySelector<HTMLElement>('[data-widget-interactive="true"]')!;
    expect(button(view.container).disabled).toBe(true);
    wrapper.focus();
    const user = userEvent.setup({ document });
    await act(async () => {
      await user.keyboard('{Enter} ');
    });
    expect(select).toHaveBeenCalledTimes(2);
    expect(store.run).not.toHaveBeenCalled();
  });
});
