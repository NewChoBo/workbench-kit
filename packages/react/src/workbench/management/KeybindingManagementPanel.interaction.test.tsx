/** @vitest-environment jsdom */

import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { KeybindingManagementEntry } from '@workbench-kit/platform';
import { describe, expect, it, vi } from 'vitest';
import { KeybindingManagementPanel } from './KeybindingManagementPanel';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

function entry(
  input: Partial<KeybindingManagementEntry> &
    Pick<KeybindingManagementEntry, 'commandId' | 'commandLabel'>,
): KeybindingManagementEntry {
  return {
    editable: true,
    storedKeys: [],
    ...input,
  };
}

async function press(target: EventTarget, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
    ...init,
  });
  await act(async () => {
    target.dispatchEvent(event);
  });
  return event;
}

describe('KeybindingManagementPanel interactions', () => {
  it('keeps unsupported rows visible with stored chords, a reason, and no mutation path', async () => {
    const onResetKeybinding = vi.fn();
    const onSetKeybinding = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <KeybindingManagementPanel
            entries={[
              entry({
                commandId: 'command.conditional',
                commandLabel: 'Conditional command',
                disabledReason:
                  'Conditional, argument, or unsupported stored keybindings cannot be edited here.',
                editable: false,
                storedKeys: ['ctrl+k', 'alt+k'],
              }),
              entry({
                commandId: 'command.ambiguous',
                commandLabel: 'Ambiguous command',
                disabledReason:
                  'Multiple stored keybindings for this command cannot be edited here.',
                editable: false,
                storedKeys: ['ctrl+a', 'meta+a'],
                userKey: 'ctrl+a',
                userKeyLabel: 'Ctrl+A',
              }),
            ]}
            onResetKeybinding={onResetKeybinding}
            onSetKeybinding={onSetKeybinding}
            platform="windows"
          />,
        );
      });

      expect(container.textContent).toContain('Conditional command');
      expect(container.textContent).toContain('Stored: Ctrl+K');
      expect(container.textContent).toContain('Stored: Alt+K');
      expect(container.textContent).toContain('Ambiguous command');
      expect(container.textContent).toContain('Stored: Ctrl+A');
      expect(container.textContent).toContain('Stored: Cmd+A');
      expect(container.textContent).toContain('cannot be edited here');
      const capture = container.querySelector<HTMLButtonElement>(
        '[aria-label="Keyboard shortcut for Conditional command"]',
      );
      expect(capture?.disabled).toBe(true);
      expect(
        container.querySelector<HTMLButtonElement>(
          '[aria-label="Keyboard shortcut for Ambiguous command"]',
        )?.disabled,
      ).toBe(true);
      const ambiguousReset = Array.from(
        container.querySelectorAll<HTMLButtonElement>('button'),
      ).find((button) => button.textContent === 'Reset to default');
      expect(ambiguousReset?.disabled).toBe(true);
      await act(async () => capture?.click());
      await act(async () => ambiguousReset?.click());
      expect(onSetKeybinding).not.toHaveBeenCalled();
      expect(onResetKeybinding).not.toHaveBeenCalled();
      expect(container.textContent).toContain('Reset to default');
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it('shows a write lock and prevents persisted or transient mutation callbacks', async () => {
    const onResetKeybinding = vi.fn();
    const onSetKeybinding = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <KeybindingManagementPanel
            editingDisabledReason="Stored shortcuts use an unsupported future format."
            entries={[
              entry({
                commandId: 'command.locked',
                commandLabel: 'Locked command',
                defaultKey: 'ctrl+l',
                defaultKeyLabel: 'Ctrl+L',
                userKey: 'alt+l',
                userKeyLabel: 'Alt+L',
              }),
            ]}
            onResetKeybinding={onResetKeybinding}
            onSetKeybinding={onSetKeybinding}
            platform="windows"
          />,
        );
      });

      const lock = container.querySelector('[role="alert"]');
      expect(lock?.textContent).toContain('unsupported future format');
      const capture = container.querySelector<HTMLButtonElement>(
        '[aria-label="Keyboard shortcut for Locked command"]',
      );
      expect(capture?.disabled).toBe(true);
      expect(capture?.getAttribute('aria-describedby')).toContain(lock?.id);
      const lockedReset = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent === 'Reset to default',
      );
      expect(lockedReset?.disabled).toBe(true);
      await act(async () => capture?.click());
      await act(async () => lockedReset?.click());
      expect(onSetKeybinding).not.toHaveBeenCalled();
      expect(onResetKeybinding).not.toHaveBeenCalled();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it('offers reset only for an override and restores focus to its stable Capture trigger', async () => {
    const onResetKeybinding = vi.fn();
    const onSetKeybinding = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    function ResetHarness() {
      const [entries, setEntries] = useState([
        entry({
          commandId: 'command.default',
          commandLabel: 'Default command',
          defaultKey: 'ctrl+d',
          defaultKeyLabel: 'Ctrl+D',
        }),
        entry({
          commandId: 'command.override',
          commandLabel: 'Override command',
          defaultKey: 'ctrl+o',
          defaultKeyLabel: 'Ctrl+O',
          effectiveKey: 'alt+o',
          effectiveKeyLabel: 'Alt+O',
          userKey: 'alt+o',
          userKeyLabel: 'Alt+O',
        }),
      ]);

      return (
        <KeybindingManagementPanel
          entries={entries}
          onResetKeybinding={(commandId) => {
            onResetKeybinding(commandId);
            setEntries((current) =>
              current.map((currentEntry) =>
                currentEntry.commandId === commandId
                  ? {
                      ...currentEntry,
                      effectiveKey: currentEntry.defaultKey,
                      effectiveKeyLabel: currentEntry.defaultKeyLabel,
                      userKey: undefined,
                      userKeyLabel: undefined,
                    }
                  : currentEntry,
              ),
            );
          }}
          onSetKeybinding={onSetKeybinding}
          platform="windows"
        />
      );
    }

    try {
      await act(async () => {
        root.render(<ResetHarness />);
      });

      expect(container.textContent).not.toContain('Clear');
      const resetButtons = Array.from(
        container.querySelectorAll<HTMLButtonElement>('button'),
      ).filter((button) => button.textContent === 'Reset to default');
      expect(resetButtons).toHaveLength(1);
      const reset = resetButtons[0];
      await act(async () => reset?.click());
      expect(onResetKeybinding).toHaveBeenCalledWith('command.override');
      expect(document.activeElement?.getAttribute('aria-label')).toBe(
        'Keyboard shortcut for Override command',
      );
      expect(container.textContent).not.toContain('Reset to default');

      const defaultCapture = container.querySelector<HTMLButtonElement>(
        '[aria-label="Keyboard shortcut for Default command"]',
      );
      await act(async () => defaultCapture?.click());
      await press(window, 'Delete');
      expect(onResetKeybinding).toHaveBeenCalledTimes(1);
      expect(onSetKeybinding).not.toHaveBeenCalled();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it('keeps a captured conflict applied, visible, described, and announced', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    function ConflictHarness() {
      const [managedEntry, setManagedEntry] = useState(
        entry({
          commandId: 'command.target',
          commandLabel: 'Target command',
          defaultKey: 'ctrl+t',
          defaultKeyLabel: 'Ctrl+T',
        }),
      );

      return (
        <KeybindingManagementPanel
          entries={[managedEntry]}
          platform="windows"
          onSetKeybinding={(_commandId, key) => {
            setManagedEntry((current) => ({
              ...current,
              conflictCommandId: 'command.other',
              effectiveKey: key,
              effectiveKeyLabel: 'Alt+K',
              userKey: key,
              userKeyLabel: 'Alt+K',
            }));
          }}
        />
      );
    }

    try {
      await act(async () => {
        root.render(<ConflictHarness />);
      });
      const capture = container.querySelector<HTMLButtonElement>(
        '[aria-label="Keyboard shortcut for Target command"]',
      );
      await act(async () => capture?.click());
      await press(window, 'k', { altKey: true });

      const warning = Array.from(container.querySelectorAll<HTMLElement>('[id]')).find(
        (element) => element.textContent === 'Conflicts with command.other',
      );
      expect(warning).toBeDefined();
      expect(capture?.textContent).toBe('Alt+K');
      expect(capture?.getAttribute('aria-describedby')).toContain(warning?.id);
      expect(
        Array.from(container.querySelectorAll('[role="status"]')).some(
          (status) => status.textContent === 'Conflicts with command.other',
        ),
      ).toBe(true);
      expect(document.activeElement).toBe(capture);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
