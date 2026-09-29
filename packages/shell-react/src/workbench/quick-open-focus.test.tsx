/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from 'vitest';
import { createQuickOpenFocusCoordinator, type QuickOpenFocusTarget } from './quick-open-focus.js';

const cleanups: (() => void)[] = [];

function createFixture() {
  const target: QuickOpenFocusTarget = {
    groupId: 'active',
    tabId: 'selected',
    resourceUri: 'workspace://file/new.ts',
  };
  let active: QuickOpenFocusTarget | undefined = target;
  const listeners = new Set<() => void>();
  const coordinator = createQuickOpenFocusCoordinator({
    resolveSuccessfulTarget: () => target,
    readActiveTarget: () => active,
    subscribeActiveTargetChange: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  });
  const container = document.createElement('div');
  const origin = document.createElement('button');
  const other = document.createElement('button');
  const dialog = document.createElement('div');
  const makeTab = () => {
    const tab = document.createElement('button');
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'true');
    tab.tabIndex = 0;
    container.append(tab);
    return tab;
  };
  container.append(origin, other);
  document.body.append(container);
  origin.focus();
  const tab = makeTab();
  const disposers: (() => void)[] = [];
  const owner = {};
  const start = () => {
    const session = coordinator.beginSession(owner);
    const operation = coordinator.beginSelection(session, { identity: {}, origin });
    expect(coordinator.recordSuccessfulExecution(operation, target)).toBe(true);
    return { session, operation };
  };
  const register = (element = tab, registrationOwner: object = {}) => {
    const dispose = coordinator.registerCommittedTarget(registrationOwner, target, element);
    disposers.push(dispose);
    return dispose;
  };
  const fixture = {
    coordinator,
    target,
    origin,
    other,
    tab,
    dialog,
    owner,
    listeners,
    start,
    register,
    makeTab,
    changeActive(next: QuickOpenFocusTarget | undefined) {
      active = next;
      for (const listener of [...listeners]) listener();
    },
    cleanup() {
      coordinator.reset();
      for (const dispose of disposers) dispose();
      container.remove();
      expect(listeners.size).toBe(0);
    },
  };
  cleanups.push(fixture.cleanup);
  return fixture;
}

async function flushSettlement() {
  await new Promise<void>((resolve) => queueMicrotask(resolve));
}

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe('Quick Open focus coordinator', () => {
  it.each(['registration first', 'acknowledgement first'] as const)(
    'rendezvous: %s',
    async (order) => {
      const fixture = createFixture();
      const { coordinator, origin, tab, dialog } = fixture;
      const { operation } = fixture.start();
      if (order === 'registration first') fixture.register();
      else coordinator.acknowledgeClosed(operation, dialog);
      await flushSettlement();
      expect(document.activeElement).toBe(origin);
      if (order === 'registration first') coordinator.acknowledgeClosed(operation, dialog);
      else fixture.register();
      expect(document.activeElement).toBe(origin);
      await flushSettlement();
      expect(document.activeElement).toBe(tab);
      expect(fixture.listeners.size).toBe(0);
    },
  );

  it.each(['new session', 'new selection'] as const)(
    'rejects stale work after %s',
    async (replacement) => {
      const fixture = createFixture();
      const { coordinator, target, origin, tab, dialog } = fixture;
      const previous = fixture.start();
      const session =
        replacement === 'new session' ? coordinator.beginSession({}) : previous.session;
      const operation = coordinator.beginSelection(session, { identity: {}, origin });
      expect(coordinator.recordSuccessfulExecution(previous.operation, target)).toBe(false);
      coordinator.acknowledgeClosed(previous.operation, dialog);
      fixture.register();
      await flushSettlement();
      expect(document.activeElement).toBe(origin);
      expect(coordinator.recordSuccessfulExecution(operation, target)).toBe(true);
      coordinator.acknowledgeClosed(operation, dialog);
      await flushSettlement();
      expect(document.activeElement).toBe(tab);
    },
  );

  it.each(['missing', 'detached', 'unselected'] as const)(
    'waits without stealing focus when the target is %s',
    async (availability) => {
      const fixture = createFixture();
      const { coordinator, origin, tab, dialog } = fixture;
      const { operation } = fixture.start();
      if (availability !== 'missing') fixture.register();
      if (availability === 'detached') tab.remove();
      if (availability === 'unselected') tab.setAttribute('aria-selected', 'false');
      coordinator.acknowledgeClosed(operation, dialog);
      await flushSettlement();
      expect(document.activeElement).toBe(origin);
      coordinator.reset();
      fixture.register(fixture.makeTab());
      await flushSettlement();
      expect(document.activeElement).toBe(origin);
      expect(fixture.listeners.size).toBe(0);
    },
  );

  it('abandons a pending target when the active service tuple moves away and back', async () => {
    const fixture = createFixture();
    const { coordinator, target, origin, dialog } = fixture;
    const { operation } = fixture.start();
    coordinator.acknowledgeClosed(operation, dialog);
    await flushSettlement();
    fixture.changeActive({ ...target, tabId: 'different' });
    fixture.changeActive(target);
    fixture.register();
    await flushSettlement();
    expect(document.activeElement).toBe(origin);
    expect(fixture.listeners.size).toBe(0);
  });

  it.each(['focus away and back', 'pointer', 'key'] as const)(
    'preserves intervening user intent: %s',
    async (input) => {
      const fixture = createFixture();
      const { coordinator, origin, other, dialog } = fixture;
      const { operation } = fixture.start();
      coordinator.acknowledgeClosed(operation, dialog);
      await flushSettlement();
      if (input === 'focus away and back') {
        other.focus();
        origin.focus();
      } else if (input === 'pointer')
        origin.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
      else origin.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
      fixture.register();
      await flushSettlement();
      expect(document.activeElement).toBe(origin);
      expect(fixture.listeners.size).toBe(0);
    },
  );

  it('abandons a different connected focus owner at acknowledgement even if origin returns', async () => {
    const fixture = createFixture();
    const { coordinator, origin, other, dialog } = fixture;
    const { operation } = fixture.start();
    fixture.register();
    other.focus();
    coordinator.acknowledgeClosed(operation, dialog);
    origin.focus();
    await flushSettlement();
    expect(document.activeElement).toBe(origin);
    expect(fixture.listeners.size).toBe(0);
  });

  it('abandons duplicate committed targets rather than choosing DOM order', async () => {
    const fixture = createFixture();
    const { coordinator, origin, dialog } = fixture;
    const { operation } = fixture.start();
    const disposeFirst = fixture.register();
    fixture.register(fixture.makeTab());
    coordinator.acknowledgeClosed(operation, dialog);
    await flushSettlement();
    expect(document.activeElement).toBe(origin);
    expect(fixture.listeners.size).toBe(0);
    disposeFirst();
    fixture.register();
    await flushSettlement();
    expect(document.activeElement).toBe(origin);
  });

  it('cannot settle from another shell scope even when its target tuple matches', async () => {
    const first = createFixture();
    const second = createFixture();
    first.origin.focus();
    const { operation } = first.start();
    second.register();
    first.coordinator.acknowledgeClosed(operation, first.dialog);
    await flushSettlement();
    expect(document.activeElement).toBe(first.origin);
    first.register();
    await flushSettlement();
    expect(document.activeElement).toBe(first.tab);
    expect(second.listeners.size).toBe(0);
  });

  it('reset cancels pending work but preserves registration ownership for effect replay', async () => {
    const fixture = createFixture();
    const { coordinator, target, origin, tab, dialog } = fixture;
    fixture.register();
    const previous = fixture.start();
    coordinator.acknowledgeClosed(previous.operation, dialog);
    coordinator.reset();
    await flushSettlement();
    expect(document.activeElement).toBe(origin);
    expect(fixture.listeners.size).toBe(0);
    expect(coordinator.recordSuccessfulExecution(previous.operation, target)).toBe(false);
    const { operation } = fixture.start();
    coordinator.acknowledgeClosed(operation, dialog);
    await flushSettlement();
    expect(document.activeElement).toBe(tab);
  });

  it('stale registration cleanup cannot remove its replacement', async () => {
    const fixture = createFixture();
    const registrationOwner = {};
    const previous = fixture.register(fixture.tab, registrationOwner);
    const replacement = fixture.makeTab();
    fixture.register(replacement, registrationOwner);
    previous();
    const { operation } = fixture.start();
    fixture.coordinator.acknowledgeClosed(operation, fixture.dialog);
    await flushSettlement();
    expect(document.activeElement).toBe(replacement);
  });
});
