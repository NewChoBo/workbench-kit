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
import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { useQuickOpenFocusCoordinator } from './quick-open-focus.js';

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
  const focusCoordinator = useQuickOpenFocusCoordinator();
  const focusOwner = useRef<object>({}).current;
  const sessionRef = useRef<object | undefined>(undefined);
  const operationRef = useRef<object | undefined>(undefined);
  const quickOpenDialogRef = useRef<HTMLElement | undefined>(undefined);
  const restorationRef = useRef<{ identity: object; origin: HTMLElement | null } | undefined>(
    undefined,
  );
  const pendingCloseRef = useRef<
    { identity: object; token: object; dialog: HTMLElement } | undefined
  >(undefined);
  const effectiveQuickOpen = enableQuickOpen && quickOpenOpen;

  useEffect(() => {
    if (!effectiveQuickOpen) return undefined;
    const record = Object.freeze({
      identity: {},
      origin: document.activeElement instanceof HTMLElement ? document.activeElement : null,
    });
    restorationRef.current = record;
    return () => {
      if (restorationRef.current === record) restorationRef.current = undefined;
    };
  }, [effectiveQuickOpen]);
  useEffect(() => {
    const pending = pendingCloseRef.current;
    if (
      quickOpenOpen ||
      paletteOpen ||
      !pending ||
      pending.token !== operationRef.current ||
      !focusCoordinator ||
      !enableQuickOpen
    )
      return;
    let current = true;
    queueMicrotask(() => {
      if (
        !current ||
        pendingCloseRef.current !== pending ||
        quickOpenOpen ||
        paletteOpen ||
        !enableQuickOpen ||
        operationRef.current !== pending.token
      )
        return;
      pendingCloseRef.current = undefined;
      focusCoordinator.acknowledgeClosed(pending.token, pending.dialog);
    });
    return () => {
      current = false;
      if (pendingCloseRef.current === pending) pendingCloseRef.current = undefined;
    };
  }, [enableQuickOpen, focusCoordinator, paletteOpen, quickOpenOpen]);

  useEffect(() => {
    if (!enableQuickOpen && focusCoordinator) {
      focusCoordinator.invalidate(focusOwner);
      sessionRef.current = undefined;
      operationRef.current = undefined;
      pendingCloseRef.current = undefined;
      setQuickOpenOpen(false);
    }
    return () => {
      focusCoordinator?.invalidate(focusOwner);
      sessionRef.current = undefined;
      operationRef.current = undefined;
      pendingCloseRef.current = undefined;
    };
  }, [enableQuickOpen, focusCoordinator, focusOwner]);

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
  }, []);

  const openPalette = useCallback(
    (query = '') => {
      focusCoordinator?.invalidate(focusOwner);
      sessionRef.current = undefined;
      operationRef.current = undefined;
      pendingCloseRef.current = undefined;
      setQuickOpenOpen(false);
      setPaletteQuery(query);
      setPaletteOpen(true);
    },
    [focusCoordinator, focusOwner],
  );

  const closeQuickOpen = useCallback(() => {
    focusCoordinator?.invalidate(focusOwner);
    sessionRef.current = undefined;
    operationRef.current = undefined;
    setQuickOpenOpen(false);
  }, [focusCoordinator, focusOwner]);

  const openQuickOpen = useCallback(
    (query = '') => {
      sessionRef.current = focusCoordinator?.beginSession(focusOwner);
      operationRef.current = undefined;
      setPaletteOpen(false);
      setQuickOpenQuery(query);
      setQuickOpenOpen(true);
    },
    [focusCoordinator, focusOwner],
  );

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
      if (operationRef.current) focusCoordinator?.invalidate(operationRef.current);
      const focusOperation =
        focusCoordinator && sessionRef.current
          ? focusCoordinator.beginSelection(sessionRef.current, restorationRef.current)
          : undefined;
      operationRef.current = focusOperation;
      let claimed: boolean | void;
      try {
        claimed = onOpenQuickOpenItem?.(item, context);
      } catch (error) {
        if (focusOperation) focusCoordinator?.invalidate(focusOperation);
        operationRef.current = undefined;
        throw error;
      }
      if (claimed) {
        closeQuickOpen();
        return;
      }

      const path = resolveQuickOpenItemPath(item);
      if (!path) {
        closeQuickOpen();
        return;
      }

      const dialog = quickOpenDialogRef.current;
      const beganInside = !!dialog && dialog.contains(document.activeElement);
      const guardedClose = () => {
        if (!focusOperation || operationRef.current !== focusOperation) return;
        if (focusCoordinator && beganInside && restorationRef.current) {
          if (dialog) pendingCloseRef.current = { identity: {}, token: focusOperation, dialog };
          setQuickOpenOpen(false);
          return;
        }
        closeQuickOpen();
      };
      if (!focusOperation || !focusCoordinator) {
        runCommandHostExecution(
          () => executeCommand(WORKSPACE_OPEN_COMMAND_ID, { path }),
          closeQuickOpen,
        );
        return;
      }
      let result: unknown;
      try {
        result = executeCommand(WORKSPACE_OPEN_COMMAND_ID, { path });
      } catch (error) {
        focusCoordinator.invalidate(focusOperation);
        closeQuickOpen();
        throw error;
      }
      let pending: boolean;
      try {
        pending = isPromiseLike(result);
      } catch (error) {
        focusCoordinator.invalidate(focusOperation);
        closeQuickOpen();
        throw error;
      }
      const complete = (value: unknown) => {
        if (operationRef.current !== focusOperation) return;
        if (!dialog?.isConnected || !dialog.contains(document.activeElement)) {
          focusCoordinator.invalidate(focusOperation);
          closeQuickOpen();
          return;
        }
        const target = focusCoordinator.resolveSuccessfulTarget(path, value);
        focusCoordinator.recordSuccessfulExecution(focusOperation, target);
        guardedClose();
      };
      if (!pending) {
        complete(result);
        return;
      }
      void Promise.resolve(result).then(complete, (error) => {
        if (operationRef.current === focusOperation) closeQuickOpen();
        throw error;
      });
      return;
    },
    [closeQuickOpen, executeCommand, focusCoordinator, focusOwner, onOpenQuickOpenItem],
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
          onQueryChange={(query) => {
            if (operationRef.current) {
              focusCoordinator?.invalidate(operationRef.current);
              operationRef.current = undefined;
            }
            setQuickOpenQuery(query);
          }}
          onSelectItem={runQuickOpenItem}
          onFocusCapture={(event) => {
            quickOpenDialogRef.current = event.currentTarget;
          }}
          onKeyDownCapture={() => {
            if (operationRef.current) focusCoordinator?.invalidate(operationRef.current);
            operationRef.current = undefined;
          }}
          onPointerDownCapture={() => {
            if (operationRef.current) focusCoordinator?.invalidate(operationRef.current);
            operationRef.current = undefined;
          }}
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
