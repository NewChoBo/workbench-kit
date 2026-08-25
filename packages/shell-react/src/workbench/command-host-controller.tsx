import {
  WorkbenchCommandPalette,
  WorkbenchQuickOpen,
  WorkbenchShortcutCommandBridge,
  matchesWorkbenchCommandPaletteShortcut,
  matchesWorkbenchQuickAccessShortcut,
  resolveQuickOpenItemPath,
  type QuickOpenItem,
  type QuickOpenProvider,
  type QuickOpenSelectContext,
  type WorkbenchCommandDescriptor,
  type WorkbenchCommandRunContext,
  type WorkbenchShortcutCommandBridgeProps,
} from '@workbench-kit/react/workbench/command-ui';
import { useCallback, useEffect, useState, type JSX } from 'react';

const WORKSPACE_OPEN_COMMAND_ID = 'workspace.open' as const;
const EMPTY_QUICK_OPEN_PROVIDERS: readonly QuickOpenProvider[] = Object.freeze([]);

export type WorkbenchCommandHostExecutor = (
  commandId: string,
  ...args: unknown[]
) => unknown | Promise<unknown>;

export interface WorkbenchCommandHostControllerProps<TContext = unknown> {
  commands: readonly WorkbenchCommandDescriptor[];
  executeCommand: WorkbenchCommandHostExecutor;

  commandPaletteCloseLabel?: string;
  commandPaletteEmptyLabel?: string;
  commandPalettePlaceholder?: string;
  commandPaletteTitle?: string;
  enableCommandPalette?: boolean;
  enableQuickOpen?: boolean;
  quickOpenCloseLabel?: string;
  quickOpenEmptyLabel?: string;
  quickOpenPlaceholder?: string;
  quickOpenProviders?: readonly QuickOpenProvider[];
  quickOpenTitle?: string;

  onOpenQuickOpenItem?: (item: QuickOpenItem, context: QuickOpenSelectContext) => boolean | void;
  onRunCommand?: (
    command: WorkbenchCommandDescriptor,
    context: WorkbenchCommandRunContext,
  ) => boolean | void;

  shortcutBridge?: false | WorkbenchShortcutCommandBridgeProps<TContext>;
}

export function WorkbenchCommandHostController<TContext = unknown>({
  commands,
  executeCommand,
  commandPaletteCloseLabel = 'Close command palette',
  commandPaletteEmptyLabel = 'No commands match your search',
  commandPalettePlaceholder = 'Search commands',
  commandPaletteTitle = 'Command Palette',
  enableCommandPalette = true,
  enableQuickOpen = true,
  quickOpenCloseLabel = 'Close Quick Open',
  quickOpenEmptyLabel = 'No matching files',
  quickOpenPlaceholder = 'Search files by name',
  quickOpenProviders = EMPTY_QUICK_OPEN_PROVIDERS,
  quickOpenTitle = 'Quick Open',
  onOpenQuickOpenItem,
  onRunCommand,
  shortcutBridge,
}: WorkbenchCommandHostControllerProps<TContext>): JSX.Element {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [quickOpenOpen, setQuickOpenOpen] = useState(false);
  const [quickOpenQuery, setQuickOpenQuery] = useState('');

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
  }, []);

  const openPalette = useCallback((query = '') => {
    setQuickOpenOpen(false);
    setPaletteQuery(query);
    setPaletteOpen(true);
  }, []);

  const closeQuickOpen = useCallback(() => {
    setQuickOpenOpen(false);
  }, []);

  const openQuickOpen = useCallback((query = '') => {
    setPaletteOpen(false);
    setQuickOpenQuery(query);
    setQuickOpenOpen(true);
  }, []);

  const runPaletteCommand = useCallback(
    (command: WorkbenchCommandDescriptor, context: WorkbenchCommandRunContext) => {
      if (onRunCommand?.(command, context)) {
        closePalette();
        return;
      }

      runCommandHostExecution(() => executeCommand(command.id), closePalette);
    },
    [closePalette, executeCommand, onRunCommand],
  );

  const runQuickOpenItem = useCallback(
    (item: QuickOpenItem, context: QuickOpenSelectContext) => {
      if (onOpenQuickOpenItem?.(item, context)) {
        closeQuickOpen();
        return;
      }

      const path = resolveQuickOpenItemPath(item);
      if (!path) {
        closeQuickOpen();
        return;
      }

      runCommandHostExecution(
        () => executeCommand(WORKSPACE_OPEN_COMMAND_ID, { path }),
        closeQuickOpen,
      );
    },
    [closeQuickOpen, executeCommand, onOpenQuickOpenItem],
  );

  useEffect(() => {
    if (!enableCommandPalette && !enableQuickOpen) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (enableCommandPalette && matchesWorkbenchCommandPaletteShortcut(event)) {
        event.preventDefault();
        openPalette('>');
        return;
      }

      if (matchesWorkbenchQuickAccessShortcut(event)) {
        event.preventDefault();
        if (enableQuickOpen) {
          openQuickOpen();
          return;
        }

        if (enableCommandPalette) {
          openPalette();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [enableCommandPalette, enableQuickOpen, openPalette, openQuickOpen]);

  return (
    <>
      {shortcutBridge ? <WorkbenchShortcutCommandBridge {...shortcutBridge} /> : null}
      {enableCommandPalette ? (
        <WorkbenchCommandPalette
          closeLabel={commandPaletteCloseLabel}
          commands={commands}
          emptyLabel={commandPaletteEmptyLabel}
          open={paletteOpen}
          placeholder={commandPalettePlaceholder}
          query={paletteQuery}
          title={commandPaletteTitle}
          onClose={closePalette}
          onQueryChange={setPaletteQuery}
          onRunCommand={runPaletteCommand}
        />
      ) : null}
      {enableQuickOpen ? (
        <WorkbenchQuickOpen
          closeLabel={quickOpenCloseLabel}
          emptyLabel={quickOpenEmptyLabel}
          open={quickOpenOpen}
          placeholder={quickOpenPlaceholder}
          providers={quickOpenProviders}
          query={quickOpenQuery}
          title={quickOpenTitle}
          onClose={closeQuickOpen}
          onQueryChange={setQuickOpenQuery}
          onSelectItem={runQuickOpenItem}
        />
      ) : null}
    </>
  );
}

function runCommandHostExecution(execute: () => unknown, close: () => void): void {
  let result: unknown;
  try {
    result = execute();
  } catch (error) {
    close();
    throw error;
  }

  let pending: boolean;
  try {
    pending = isPromiseLike(result);
  } catch (error) {
    close();
    throw error;
  }

  if (!pending) {
    close();
    return;
  }

  void Promise.resolve(result).finally(close);
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    ((typeof value === 'object' && value !== null) || typeof value === 'function') &&
    'then' in value &&
    typeof value.then === 'function'
  );
}
