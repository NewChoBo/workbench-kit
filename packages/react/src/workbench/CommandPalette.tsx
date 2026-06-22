import {
  useEffect,
  useId,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { IconButton } from '../primitives/IconButton';
import { TextInput } from '../primitives/TextInput';
import { cx } from '../utils/cx';
import {
  filterWorkbenchCommands,
  getNextWorkbenchCommandIndex,
  isWorkbenchCommandRunnable,
  normalizeWorkbenchCommandQuery,
  type WorkbenchCommandDescriptor,
  type WorkbenchCommandRunContext,
} from './command-model';
import { WorkbenchCommandList } from './CommandList';
export { WorkbenchCommandList } from './CommandList';
export type { WorkbenchCommandListProps } from './CommandList';
export { WorkbenchCommandGroupShell } from './CommandGroupShell';
export type { WorkbenchCommandGroupShellProps } from './CommandGroupShell';

export {
  commandMenuItemsToWorkbenchCommandDescriptors,
  commandMenuItemToWorkbenchCommandDescriptor,
  filterWorkbenchCommands,
  getNextWorkbenchCommandIndex,
  getWorkbenchCommandExecutionLabel,
  getWorkbenchCommandStatusLabel,
  groupWorkbenchCommands,
  isWorkbenchCommandRunnable,
  normalizeWorkbenchCommandQuery,
} from './command-model';
export {
  getWorkbenchCommandExecutionPolicyLabel,
  isWorkbenchCommandExecutionPolicy,
  resolveWorkbenchCommandExecutionPolicy,
} from './command-execution-policy';
export type { ResolveWorkbenchCommandExecutionPolicyInput } from './command-execution-policy';
export type {
  WorkbenchCommandDescriptor,
  WorkbenchCommandDescriptorOverrides,
  WorkbenchCommandExecution,
  WorkbenchCommandExecutionPolicy,
  WorkbenchCommandFeedback,
  WorkbenchCommandFilterInput,
  WorkbenchCommandGroup,
  WorkbenchCommandGroupBy,
  WorkbenchCommandGroupingInput,
  WorkbenchCommandNavigationInput,
  WorkbenchCommandOutput,
  WorkbenchCommandRunContext,
  WorkbenchCommandRunSource,
  WorkbenchCommandSideEffect,
  WorkbenchCommandStatus,
} from './command-model';

interface WorkbenchCommandPaletteKeyEvent {
  key: string;
  preventDefault: () => void;
}

function useControllableCommandQuery({
  defaultQuery = '',
  query,
  onQueryChange,
}: {
  defaultQuery?: string | undefined;
  query?: string | undefined;
  onQueryChange?: ((query: string) => void) | undefined;
}) {
  const [uncontrolledQuery, setUncontrolledQuery] = useState(defaultQuery);
  const resolvedQuery = query ?? uncontrolledQuery;

  const setQuery = (nextQuery: string) => {
    if (query === undefined) {
      setUncontrolledQuery(nextQuery);
    }
    onQueryChange?.(nextQuery);
  };

  return [resolvedQuery, setQuery] as const;
}

export interface WorkbenchCommandPaletteProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'onSelect' | 'title'
> {
  activeCommandId?: string | undefined;
  closeLabel?: string | undefined;
  commands: readonly WorkbenchCommandDescriptor[];
  defaultQuery?: string | undefined;
  emptyLabel?: ReactNode | undefined;
  onActiveCommandChange?: ((commandId: string) => void) | undefined;
  onClose: () => void;
  onQueryChange?: ((query: string) => void) | undefined;
  onRunCommand?:
    | ((command: WorkbenchCommandDescriptor, context: WorkbenchCommandRunContext) => void)
    | undefined;
  open?: boolean | undefined;
  placeholder?: string | undefined;
  query?: string | undefined;
  restoreFocusOnClose?: boolean | undefined;
  title?: ReactNode | undefined;
}

export function WorkbenchCommandPalette({
  activeCommandId,
  className,
  closeLabel = 'Close command palette',
  commands,
  defaultQuery,
  emptyLabel = 'No commands match your search',
  onActiveCommandChange,
  onClose,
  onQueryChange,
  onRunCommand,
  open = true,
  placeholder = 'Search commands',
  query,
  restoreFocusOnClose = true,
  title = 'Command Palette',
  ...props
}: WorkbenchCommandPaletteProps) {
  const titleId = useId();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [uncontrolledActiveCommandId, setUncontrolledActiveCommandId] = useState<string>();
  const [resolvedQuery, setResolvedQuery] = useControllableCommandQuery({
    defaultQuery,
    onQueryChange,
    query,
  });
  const commandQuery = normalizeWorkbenchCommandQuery(resolvedQuery);
  const filteredCommands = useMemo(
    () => filterWorkbenchCommands({ commands, query: commandQuery }),
    [commandQuery, commands],
  );
  const fallbackActiveCommand = filteredCommands.find((command) =>
    isWorkbenchCommandRunnable(command),
  );
  const resolvedActiveCommandId =
    activeCommandId ?? uncontrolledActiveCommandId ?? fallbackActiveCommand?.id;
  const activeIndex = filteredCommands.findIndex(
    (command) => command.id === resolvedActiveCommandId,
  );
  const activeCommand = activeIndex >= 0 ? filteredCommands[activeIndex] : fallbackActiveCommand;

  const updateActiveCommand = useCallback(
    (commandId: string | undefined) => {
      if (!commandId) return;
      if (activeCommandId === undefined) {
        setUncontrolledActiveCommandId(commandId);
      }
      onActiveCommandChange?.(commandId);
    },
    [activeCommandId, onActiveCommandChange],
  );

  const restoreFocus = useCallback(() => {
    if (!restoreFocusOnClose) return;
    previousFocusRef.current?.focus();
  }, [restoreFocusOnClose]);

  const closePalette = useCallback(() => {
    restoreFocus();
    onClose();
  }, [onClose, restoreFocus]);

  const runCommand = useCallback(
    (command: WorkbenchCommandDescriptor, context: WorkbenchCommandRunContext) => {
      if (!isWorkbenchCommandRunnable(command)) return;
      onRunCommand?.(command, context);
    },
    [onRunCommand],
  );

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(frame);
      restoreFocus();
    };
  }, [open, restoreFocus]);

  useEffect(() => {
    if (!open) return;
    if (activeCommandId !== undefined) return;

    setUncontrolledActiveCommandId((currentCommandId) => {
      const nextCommandId = fallbackActiveCommand?.id;

      return currentCommandId === nextCommandId ? currentCommandId : nextCommandId;
    });
  }, [activeCommandId, fallbackActiveCommand?.id, open]);

  const handlePaletteKeyDown = useCallback(
    (event: WorkbenchCommandPaletteKeyEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePalette();
        return;
      }

      if (
        event.key !== 'ArrowDown' &&
        event.key !== 'ArrowUp' &&
        event.key !== 'Home' &&
        event.key !== 'End' &&
        event.key !== 'PageDown' &&
        event.key !== 'PageUp' &&
        event.key !== 'Enter'
      ) {
        return;
      }

      if (event.key === 'Enter') {
        if (!activeCommand) return;
        event.preventDefault();
        runCommand(activeCommand, {
          index: filteredCommands.findIndex((command) => command.id === activeCommand.id),
          query: commandQuery,
          source: 'palette',
        });
        return;
      }

      event.preventDefault();

      const direction =
        event.key === 'ArrowUp' || event.key === 'End' || event.key === 'PageUp'
          ? 'previous'
          : 'next';
      const stepCount = event.key === 'PageDown' || event.key === 'PageUp' ? 5 : 1;
      let nextIndex =
        event.key === 'Home'
          ? getNextWorkbenchCommandIndex({
              commands: filteredCommands,
              currentIndex: -1,
              direction: 'next',
            })
          : event.key === 'End'
            ? getNextWorkbenchCommandIndex({
                commands: filteredCommands,
                currentIndex: 0,
                direction: 'previous',
              })
            : activeIndex;

      if (event.key !== 'Home' && event.key !== 'End') {
        for (let step = 0; step < stepCount; step += 1) {
          const steppedIndex = getNextWorkbenchCommandIndex({
            commands: filteredCommands,
            currentIndex: nextIndex,
            direction,
          });

          if (steppedIndex < 0 || steppedIndex === nextIndex) break;
          nextIndex = steppedIndex;
        }
      }

      if (nextIndex >= 0) {
        updateActiveCommand(filteredCommands[nextIndex]?.id);
      }
    },
    [
      activeCommand,
      activeIndex,
      closePalette,
      commandQuery,
      filteredCommands,
      runCommand,
      updateActiveCommand,
    ],
  );

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented) return;

      handlePaletteKeyDown(event);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [handlePaletteKeyDown, open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    handlePaletteKeyDown(event);
  };

  if (!open) return null;

  return (
    <div className="ui-workbench-command-palette-overlay" onClick={closePalette}>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={cx('ui-workbench-command-palette', className)}
        role="dialog"
        {...props}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ui-workbench-command-palette__header">
          <span id={titleId} className="ui-workbench-command-palette__title">
            {title}
          </span>
          <IconButton
            className="ui-workbench-command-palette__close"
            icon="codicon-close"
            label={closeLabel}
            onClick={closePalette}
          />
        </div>
        <div className="ui-workbench-command-palette__search">
          <i aria-hidden="true" className="codicon codicon-search" />
          <TextInput
            ref={inputRef}
            aria-activedescendant={activeCommand ? `${listId}-${activeCommand.id}` : undefined}
            aria-controls={listId}
            aria-label={placeholder}
            className="ui-workbench-command-palette__input"
            controlWidth="full"
            placeholder={placeholder}
            type="search"
            value={resolvedQuery}
            onValueChange={setResolvedQuery}
            onKeyDown={handleKeyDown}
          />
        </div>
        <WorkbenchCommandList
          id={listId}
          activeCommandId={activeCommand?.id}
          aria-label="Command palette results"
          commands={filteredCommands}
          emptyLabel={emptyLabel}
          query={resolvedQuery}
          source="palette"
          onActiveCommandChange={updateActiveCommand}
          onRunCommand={runCommand}
        />
      </div>
    </div>
  );
}

export interface WorkbenchCommandSuggestProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'onSelect'
> {
  activeCommandId?: string | undefined;
  commands: readonly WorkbenchCommandDescriptor[];
  emptyLabel?: ReactNode | undefined;
  onActiveCommandChange?: ((commandId: string) => void) | undefined;
  onRunCommand?:
    | ((command: WorkbenchCommandDescriptor, context: WorkbenchCommandRunContext) => void)
    | undefined;
  query?: string | undefined;
  visible?: boolean | undefined;
}

export function WorkbenchCommandSuggest({
  activeCommandId,
  className,
  commands,
  emptyLabel = 'No suggested commands',
  onActiveCommandChange,
  onRunCommand,
  query = '',
  visible = true,
  ...props
}: WorkbenchCommandSuggestProps) {
  const filteredCommands = useMemo(
    () => filterWorkbenchCommands({ commands, limit: 8, query }),
    [commands, query],
  );
  const fallbackActiveCommand = filteredCommands.find((command) =>
    isWorkbenchCommandRunnable(command),
  );

  if (!visible) return null;

  return (
    <div className={cx('ui-workbench-command-suggest', className)} {...props}>
      <div className="ui-workbench-command-suggest__header">
        <span>Commands</span>
        {query ? <span className="ui-workbench-command-suggest__query">/{query}</span> : null}
      </div>
      <WorkbenchCommandList
        activeCommandId={activeCommandId ?? fallbackActiveCommand?.id}
        aria-label="Suggested commands"
        commands={filteredCommands}
        emptyLabel={emptyLabel}
        query={query}
        source="suggest"
        onActiveCommandChange={onActiveCommandChange}
        onRunCommand={onRunCommand}
      />
    </div>
  );
}
