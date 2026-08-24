/** @vitest-environment jsdom */

import { act, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createCommandRegistry,
  projectCommandRegistryKeybindings,
  type CommandDefinition,
  type CommandRegistry,
} from '@workbench-kit/platform';
import { describe, expect, it } from 'vitest';
import { KeybindingCaptureField } from '../management/KeybindingCaptureField';
import { WorkbenchShortcutCommandBridge } from './ShortcutCommandBridge';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

interface TestContext {
  readonly log: string[];
}

function command(id: string, shortcut: string): CommandDefinition<TestContext> {
  return {
    id,
    label: id,
    run: ({ log }) => log.push(id),
    shortcut,
  };
}

function RegisterCommandInLayoutEffect({
  definition,
  registry,
}: {
  readonly definition: CommandDefinition<TestContext>;
  readonly registry: CommandRegistry<TestContext>;
}) {
  useLayoutEffect(() => {
    const disposable = registry.registerCommand(definition);
    return () => disposable.dispose();
  }, [definition, registry]);

  return null;
}

async function dispatchShortcut(key: string, modifiers: KeyboardEventInit = {}) {
  await act(async () => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...modifiers }),
    );
  });
}

describe('WorkbenchShortcutCommandBridge interactions', () => {
  it('reprojects and subscribes only for the internal CommandRegistry source', async () => {
    const context: TestContext = { log: [] };
    const registry = createCommandRegistry([command('command.first', 'Ctrl+1')]);
    const container = document.createElement('div');
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <WorkbenchShortcutCommandBridge
            context={context}
            platform="windows"
            registry={registry}
          />,
        );
      });

      await dispatchShortcut('1', { ctrlKey: true });
      expect(context.log).toEqual(['command.first']);

      await act(async () => {
        registry.registerCommand(command('command.second', 'Ctrl+2'));
      });
      await dispatchShortcut('2', { ctrlKey: true });
      expect(context.log).toEqual(['command.first', 'command.second']);
    } finally {
      await act(async () => root.unmount());
    }
  });

  it('reconciles a command registered before its internal layout subscription', async () => {
    const context: TestContext = { log: [] };
    const registry = createCommandRegistry<TestContext>([]);
    const lateCommand = command('command.layout', 'Ctrl+L');
    const container = document.createElement('div');
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <>
            <RegisterCommandInLayoutEffect definition={lateCommand} registry={registry} />
            <WorkbenchShortcutCommandBridge
              context={context}
              platform="windows"
              registry={registry}
            />
          </>,
        );
      });

      await dispatchShortcut('l', { ctrlKey: true });
      expect(context.log).toEqual(['command.layout']);
    } finally {
      await act(async () => root.unmount());
    }
  });

  it('consumes a supplied projection as-is until the caller replaces it', async () => {
    const context: TestContext = { log: [] };
    const registry = createCommandRegistry([command('command.first', 'Ctrl+1')]);
    const firstProjection = projectCommandRegistryKeybindings({
      context,
      platform: 'windows',
      registry,
    });
    const container = document.createElement('div');
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <WorkbenchShortcutCommandBridge
            context={context}
            keybindingProjection={firstProjection}
            platform="windows"
            registry={registry}
          />,
        );
      });

      await act(async () => {
        registry.registerCommand(command('command.second', 'Ctrl+2'));
      });
      await dispatchShortcut('2', { ctrlKey: true });
      expect(context.log).toEqual([]);

      const secondProjection = projectCommandRegistryKeybindings({
        context,
        platform: 'windows',
        registry,
      });
      await act(async () => {
        root.render(
          <WorkbenchShortcutCommandBridge
            context={context}
            keybindingProjection={secondProjection}
            platform="windows"
            registry={registry}
          />,
        );
      });
      await dispatchShortcut('2', { ctrlKey: true });
      expect(context.log).toEqual(['command.second']);
    } finally {
      await act(async () => root.unmount());
    }
  });

  it('keeps explicit bindings authoritative and suppresses defaults only for supported overrides', async () => {
    const context: TestContext = { log: [] };
    const registry = createCommandRegistry([
      command('command.explicit', 'Ctrl+E'),
      command('command.mixed', 'Ctrl+M'),
      command('command.duplicate', 'Ctrl+D'),
      command('command.override', 'Ctrl+O'),
      command('command.unsupported', 'Ctrl+U'),
    ]);
    const projection = projectCommandRegistryKeybindings({
      commandIds: ['command.duplicate', 'command.mixed', 'command.override', 'command.unsupported'],
      context,
      platform: 'windows',
      registry,
    });
    const container = document.createElement('div');
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <WorkbenchShortcutCommandBridge
            context={context}
            keybindingOverrides={[
              { command: 'command.override', key: 'Alt+O' },
              { command: 'command.explicit', key: 'Alt+E' },
              { command: 'command.mixed', key: 'Alt+M' },
              { command: 'command.mixed', key: 'Shift+M', when: 'editorFocused' },
              { command: 'command.duplicate', key: 'Alt+D' },
              { command: 'command.duplicate', key: 'Shift+D' },
              { command: 'command.unsupported', key: 'Alt+U', when: 'editorFocused' },
            ]}
            keybindingProjection={projection}
            platform="windows"
            registry={registry}
          />,
        );
      });

      await dispatchShortcut('o', { ctrlKey: true });
      await dispatchShortcut('o', { altKey: true });
      await dispatchShortcut('u', { ctrlKey: true });
      await dispatchShortcut('u', { altKey: true });
      await dispatchShortcut('e', { altKey: true });
      await dispatchShortcut('m', { ctrlKey: true });
      await dispatchShortcut('m', { altKey: true });
      await dispatchShortcut('m', { shiftKey: true });
      await dispatchShortcut('d', { ctrlKey: true });
      await dispatchShortcut('d', { altKey: true });
      await dispatchShortcut('d', { shiftKey: true });
      expect(context.log).toEqual([
        'command.override',
        'command.unsupported',
        'command.mixed',
        'command.duplicate',
      ]);

      context.log.length = 0;
      await act(async () => {
        root.render(
          <WorkbenchShortcutCommandBridge
            context={context}
            keybindingOverrides={[{ command: 'command.override', key: 'Ctrl+Shift+O' }]}
            keybindingProjection={projection}
            platform="windows"
            registry={registry}
          />,
        );
      });
      await dispatchShortcut('o', { altKey: true });
      await dispatchShortcut('o', { ctrlKey: true, shiftKey: true });
      expect(context.log).toEqual(['command.override']);

      context.log.length = 0;
      await act(async () => {
        root.render(
          <WorkbenchShortcutCommandBridge
            bindings={[{ commandId: 'command.explicit', shortcut: 'Alt+E' }]}
            context={context}
            platform="windows"
            registry={registry}
          />,
        );
      });
      await dispatchShortcut('e', { ctrlKey: true });
      await dispatchShortcut('e', { altKey: true });
      expect(context.log).toEqual(['command.explicit']);
    } finally {
      await act(async () => root.unmount());
    }
  });

  it('does not execute a command while its focused Capture trigger records that chord', async () => {
    const context: TestContext = { log: [] };
    const captured: Array<string | undefined> = [];
    const registry = createCommandRegistry([command('command.capture', 'Ctrl+K')]);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <>
            <WorkbenchShortcutCommandBridge
              context={context}
              platform="windows"
              registry={registry}
            />
            <KeybindingCaptureField onChange={(key) => captured.push(key)} platform="windows" />
          </>,
        );
      });
      const trigger = container.querySelector<HTMLButtonElement>(
        '.workbench-keybinding-capture__trigger',
      );
      await act(async () => trigger?.click());
      await act(async () => {
        trigger?.dispatchEvent(
          new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            ctrlKey: true,
            key: 'k',
          }),
        );
      });

      expect(captured).toEqual(['ctrl+k']);
      expect(context.log).toEqual([]);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
