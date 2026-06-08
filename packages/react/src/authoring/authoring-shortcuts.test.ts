import { describe, expect, it, vi } from 'vitest';

import { handleAuthoringShortcutKeyDown } from './authoring-shortcuts.js';

function keyEvent(
  key: string,
  options: {
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    target?: EventTarget | null;
  } = {},
): KeyboardEvent {
  return {
    key,
    ctrlKey: options.ctrlKey ?? false,
    metaKey: options.metaKey ?? false,
    shiftKey: options.shiftKey ?? false,
    target: options.target ?? null,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent;
}

describe('authoring shortcuts', () => {
  it('invokes undo on Ctrl+Z', () => {
    const onUndo = vi.fn();
    const handled = handleAuthoringShortcutKeyDown(
      keyEvent('z', { ctrlKey: true }),
      { onUndo },
      { canUndo: true },
    );

    expect(handled).toBe(true);
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it('invokes redo on Ctrl+Y', () => {
    const onRedo = vi.fn();
    const handled = handleAuthoringShortcutKeyDown(
      keyEvent('y', { ctrlKey: true }),
      { onRedo },
      { canRedo: true },
    );

    expect(handled).toBe(true);
    expect(onRedo).toHaveBeenCalledOnce();
  });

  it('invokes delete on Delete key', () => {
    const onDelete = vi.fn();
    const handled = handleAuthoringShortcutKeyDown(
      keyEvent('Delete'),
      { onDelete },
      { canDelete: true },
    );

    expect(handled).toBe(true);
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('ignores shortcuts when focus is in an input', () => {
    const onUndo = vi.fn();
    const input = {
      tagName: 'INPUT',
      isContentEditable: false,
    } as unknown as HTMLElement;

    const handled = handleAuthoringShortcutKeyDown(
      keyEvent('z', { ctrlKey: true, target: input }),
      { onUndo },
      { canUndo: true },
    );

    expect(handled).toBe(false);
    expect(onUndo).not.toHaveBeenCalled();
  });
});
