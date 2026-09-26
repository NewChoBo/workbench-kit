/** @vitest-environment jsdom */

import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { ContextMenu } from './ContextMenu';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('ContextMenu keyboard model', () => {
  it.each([
    ['Tab', false],
    ['Shift+Tab', true],
  ] as const)(
    'dismisses after %s moves focus outside without swallowing navigation',
    async (_name, shiftKey) => {
      const onClose = vi.fn();
      const onSelect = vi.fn();
      const container = document.createElement('div');
      document.body.append(container);
      const root = createRoot(container);
      function Host() {
        const [open, setOpen] = useState(true);
        return (
          <>
            <button data-before>Before</button>
            {open ? (
              <ContextMenu
                items={[{ id: 'edit', label: 'Edit', onSelect }]}
                x={12}
                y={24}
                onClose={() => {
                  onClose();
                  setOpen(false);
                }}
              />
            ) : null}
            <button data-after>After</button>
          </>
        );
      }
      try {
        await act(async () => root.render(<Host />));
        const item = container.querySelector<HTMLElement>('[role="menuitem"]')!;
        const destination = container.querySelector<HTMLElement>(
          shiftKey ? '[data-before]' : '[data-after]',
        )!;
        expect(document.activeElement).toBe(item);
        const event = new KeyboardEvent('keydown', {
          key: 'Tab',
          shiftKey,
          bubbles: true,
          cancelable: true,
        });
        await act(async () => {
          item.dispatchEvent(event);
        });
        expect(event.defaultPrevented).toBe(false);
        expect(onClose).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(item);

        // jsdom does not perform Tab's default focus traversal; deliver the real focus transition.
        await act(async () => destination.focus());
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(container.querySelector('[role="menu"]')).toBeNull();
        expect(document.activeElement).toBe(destination);
        expect(onSelect).not.toHaveBeenCalled();
      } finally {
        await act(async () => root.unmount());
        container.remove();
      }
    },
  );

  it('keeps internal focus navigation open and preserves focus chosen by an action', async () => {
    const onClose = vi.fn();
    const invoker = document.createElement('button');
    const editor = document.createElement('input');
    const container = document.createElement('div');
    document.body.append(invoker, container, editor);
    invoker.focus();
    const root = createRoot(container);
    const onSelect = vi.fn(() => editor.focus());
    try {
      await act(async () =>
        root.render(
          <ContextMenu
            items={[
              { id: 'inspect', label: 'Inspect', onSelect: vi.fn() },
              { id: 'edit', label: 'Edit', onSelect },
            ]}
            x={12}
            y={24}
            onClose={onClose}
          />,
        ),
      );
      const menu = container.querySelector<HTMLElement>('[role="menu"]')!;
      await act(async () => {
        menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      });
      expect(document.activeElement).toBe(container.querySelector('[data-menu-index="1"]'));
      expect(onClose).not.toHaveBeenCalled();
      await act(async () => {
        menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      });
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(document.activeElement).toBe(editor);
    } finally {
      await act(async () => root.unmount());
      invoker.remove();
      editor.remove();
      container.remove();
    }
  });

  it('moves highlight with arrows/Home/End and activates with Enter', async () => {
    const onClose = vi.fn();
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ContextMenu
          items={[
            { id: 'open', label: 'Open', onSelect: onOpen },
            { type: 'separator' },
            { id: 'rename', label: 'Rename', disabled: true, onSelect: vi.fn() },
            { id: 'delete', label: 'Delete', onSelect: onDelete },
          ]}
          x={12}
          y={24}
          onClose={onClose}
        />,
      );
    });

    const menu = container.querySelector<HTMLElement>('[role="menu"]');
    expect(menu).not.toBeNull();
    expect(container.querySelector('[data-menu-index="0"]')?.getAttribute('data-highlighted')).toBe(
      'true',
    );

    await act(async () => {
      menu!.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    });
    expect(container.querySelector('[data-menu-index="3"]')?.getAttribute('data-highlighted')).toBe(
      'true',
    );

    await act(async () => {
      menu!.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }));
    });
    expect(container.querySelector('[data-menu-index="0"]')?.getAttribute('data-highlighted')).toBe(
      'true',
    );

    await act(async () => {
      menu!.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'End' }));
    });
    expect(container.querySelector('[data-menu-index="3"]')?.getAttribute('data-highlighted')).toBe(
      'true',
    );

    await act(async () => {
      menu!.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    });

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('restores an explicit connected target only when Escape dismisses the menu', async () => {
    const onClose = vi.fn();
    const invoker = document.createElement('button');
    const container = document.createElement('div');
    document.body.append(invoker, container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ContextMenu
          items={[{ id: 'open', label: 'Open', onSelect: vi.fn() }]}
          returnFocusTarget={invoker}
          x={12}
          y={24}
          onClose={onClose}
        />,
      );
    });

    expect(document.activeElement).toBe(container.querySelector<HTMLElement>('[role="menuitem"]'));

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(invoker);

    await act(async () => {
      root.unmount();
    });
    invoker.remove();
    container.remove();
  });

  it('falls back to the active element captured before menu-item focus', async () => {
    const onClose = vi.fn();
    const invoker = document.createElement('button');
    const container = document.createElement('div');
    document.body.append(invoker, container);
    invoker.focus();
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ContextMenu
          items={[{ id: 'open', label: 'Open', onSelect: vi.fn() }]}
          x={12}
          y={24}
          onClose={onClose}
        />,
      );
    });

    expect(document.activeElement).toBe(container.querySelector<HTMLElement>('[role="menuitem"]'));

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(invoker);

    await act(async () => {
      root.unmount();
    });
    invoker.remove();
    container.remove();
  });

  it('closes safely without focusing a detached explicit target', async () => {
    const onClose = vi.fn();
    const invoker = document.createElement('button');
    const container = document.createElement('div');
    document.body.append(invoker, container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ContextMenu
          items={[{ id: 'open', label: 'Open', onSelect: vi.fn() }]}
          returnFocusTarget={invoker}
          x={12}
          y={24}
          onClose={onClose}
        />,
      );
    });

    invoker.remove();
    const focus = vi.spyOn(invoker, 'focus');

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(focus).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('does not restore focus when a menu item activates', async () => {
    const onClose = vi.fn();
    const onOpen = vi.fn();
    const invoker = document.createElement('button');
    const container = document.createElement('div');
    document.body.append(invoker, container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ContextMenu
          items={[{ id: 'open', label: 'Open', onSelect: onOpen }]}
          returnFocusTarget={invoker}
          x={12}
          y={24}
          onClose={onClose}
        />,
      );
    });

    const menu = container.querySelector<HTMLElement>('[role="menu"]');
    await act(async () => {
      menu?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    });

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).not.toBe(invoker);

    await act(async () => {
      root.unmount();
    });
    invoker.remove();
    container.remove();
  });
});
