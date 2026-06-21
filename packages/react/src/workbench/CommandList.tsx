import { useEffect, useId, useRef, type ComponentPropsWithRef, type ReactNode } from 'react';
import { Button } from '../primitives/Button';
import { EmptyState } from '../primitives/EmptyState';
import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';
import {
  getWorkbenchCommandExecutionLabel,
  getWorkbenchCommandStatusLabel,
  isWorkbenchCommandRunnable,
  type WorkbenchCommandDescriptor,
  type WorkbenchCommandRunContext,
  type WorkbenchCommandRunSource,
} from './command-model';
import { isWorkbenchStatusBusy } from './status';

function commandIcon(command: WorkbenchCommandDescriptor) {
  if (!command.icon) return null;
  return <i aria-hidden="true" className={cxCodicon(command.icon)} />;
}

function commandStatus(command: WorkbenchCommandDescriptor) {
  const status = command.status ?? (command.disabled ? 'disabled' : 'idle');

  return (
    <span
      aria-label={getWorkbenchCommandStatusLabel(status)}
      className="ui-workbench-command-item__status"
      title={getWorkbenchCommandStatusLabel(status)}
    >
      <span aria-hidden="true" className="ui-workbench-command-item__status-dot" />
    </span>
  );
}

function commandExecution(command: WorkbenchCommandDescriptor) {
  if (!command.execution) return null;

  return (
    <span className="ui-workbench-command-item__chip">
      {getWorkbenchCommandExecutionLabel(command.execution)}
    </span>
  );
}

export interface WorkbenchCommandListProps extends Omit<
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
  source?: WorkbenchCommandRunSource | undefined;
}

export function WorkbenchCommandList({
  activeCommandId,
  className,
  commands,
  emptyLabel = 'No commands available',
  id,
  onActiveCommandChange,
  onRunCommand,
  query = '',
  source = 'list',
  ...props
}: WorkbenchCommandListProps) {
  const generatedId = useId();
  const listId = id ?? generatedId;
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeCommandId) return;

    const activeElement = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('[data-command-id]') ?? [],
    ).find((element) => element.dataset.commandId === activeCommandId);

    activeElement?.scrollIntoView?.({ block: 'nearest' });
  }, [activeCommandId, commands]);

  if (commands.length === 0) {
    return (
      <div
        id={id}
        className={cx('ui-workbench-command-list', 'ui-workbench-scrollbar', className)}
        {...props}
      >
        <EmptyState compact icon="codicon-search">
          {emptyLabel}
        </EmptyState>
      </div>
    );
  }

  return (
    <div
      id={id}
      aria-label={props['aria-label'] ?? 'Commands'}
      className={cx('ui-workbench-command-list', 'ui-workbench-scrollbar', className)}
      role="listbox"
      {...props}
      ref={listRef}
    >
      {commands.map((command, index) => {
        const active = command.id === activeCommandId;
        const disabled = !isWorkbenchCommandRunnable(command);
        const itemId = `${listId}-${command.id}`;
        const descriptionId = command.description ? `${itemId}-description` : undefined;
        const disabledReasonId = command.disabledReason ? `${itemId}-disabled` : undefined;

        return (
          <Button
            key={command.id}
            id={itemId}
            aria-busy={command.status && isWorkbenchStatusBusy(command.status) ? true : undefined}
            aria-describedby={
              [descriptionId, disabledReasonId].filter(Boolean).join(' ') || undefined
            }
            aria-selected={active}
            className="ui-workbench-command-item"
            data-active={active ? 'true' : undefined}
            data-command-id={command.id}
            data-danger={command.danger ? 'true' : undefined}
            data-status={command.status ?? (command.disabled ? 'disabled' : 'idle')}
            disabled={disabled}
            role="option"
            onClick={() => onRunCommand?.(command, { index, query, source })}
            onMouseDown={(event) => {
              if (source === 'suggest') event.preventDefault();
            }}
            onMouseEnter={() => onActiveCommandChange?.(command.id)}
          >
            <span className="ui-workbench-command-item__icon">{commandIcon(command)}</span>
            <span className="ui-workbench-command-item__content">
              <span className="ui-workbench-command-item__label">{command.label}</span>
              {command.description ? (
                <span id={descriptionId} className="ui-workbench-command-item__description">
                  {command.description}
                </span>
              ) : null}
              {command.disabledReason ? (
                <span id={disabledReasonId} className="ui-visually-hidden">
                  {command.disabledReason}
                </span>
              ) : null}
            </span>
            <span className="ui-workbench-command-item__meta">
              {command.category ? (
                <span className="ui-workbench-command-item__category">{command.category}</span>
              ) : null}
              {commandExecution(command)}
              {command.shortcut ? (
                <kbd className="ui-workbench-command-item__shortcut">{command.shortcut}</kbd>
              ) : null}
              {commandStatus(command)}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
