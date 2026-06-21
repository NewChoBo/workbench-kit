import { useId, useMemo, type ComponentPropsWithRef, type ReactNode } from 'react';
import { EmptyState } from '../primitives/EmptyState';
import { cx } from '../utils/cx';
import { WorkbenchCommandList } from './CommandList';
import {
  filterWorkbenchCommands,
  groupWorkbenchCommands,
  type WorkbenchCommandDescriptor,
  type WorkbenchCommandGroupBy,
  type WorkbenchCommandRunContext,
} from './command-model';

export interface WorkbenchCommandGroupShellProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'onSelect'
> {
  activeCommandId?: string | undefined;
  commands: readonly WorkbenchCommandDescriptor[];
  emptyLabel?: ReactNode | undefined;
  fallbackGroupLabel?: string | undefined;
  groupBy?: WorkbenchCommandGroupBy | undefined;
  groupNavLabel?: string | undefined;
  onActiveCommandChange?: ((commandId: string) => void) | undefined;
  onRunCommand?:
    | ((command: WorkbenchCommandDescriptor, context: WorkbenchCommandRunContext) => void)
    | undefined;
  query?: string | undefined;
  showGroupCounts?: boolean | undefined;
  showGroupNav?: boolean | undefined;
}

export function WorkbenchCommandGroupShell({
  activeCommandId,
  className,
  commands,
  emptyLabel = 'No commands available',
  fallbackGroupLabel = 'Other',
  groupBy = 'category',
  groupNavLabel = 'Command groups',
  onActiveCommandChange,
  onRunCommand,
  query = '',
  showGroupCounts = true,
  showGroupNav = true,
  ...props
}: WorkbenchCommandGroupShellProps) {
  const generatedId = useId().replace(/:/g, '');
  const filteredCommands = useMemo(
    () => filterWorkbenchCommands({ commands, query }),
    [commands, query],
  );
  const groups = useMemo(
    () => groupWorkbenchCommands({ commands: filteredCommands, fallbackGroupLabel, groupBy }),
    [fallbackGroupLabel, filteredCommands, groupBy],
  );

  if (groups.length === 0) {
    return (
      <div
        className={cx('ui-workbench-command-group-shell', className)}
        data-show-group-nav={showGroupNav ? 'true' : 'false'}
        {...props}
      >
        <EmptyState compact icon="codicon-symbol-keyword">
          {emptyLabel}
        </EmptyState>
      </div>
    );
  }

  return (
    <div
      className={cx('ui-workbench-command-group-shell', className)}
      data-show-group-nav={showGroupNav ? 'true' : 'false'}
      {...props}
    >
      {showGroupNav ? (
        <nav
          aria-label={groupNavLabel}
          className="ui-workbench-command-group-shell__nav ui-workbench-scrollbar"
        >
          {groups.map((group) => (
            <a
              key={group.id}
              className="ui-workbench-command-group-shell__nav-link"
              href={`#${generatedId}-${group.id}`}
            >
              <span>{group.label}</span>
              {showGroupCounts ? <em>{group.commands.length}</em> : null}
            </a>
          ))}
        </nav>
      ) : null}
      <div className="ui-workbench-command-group-shell__content ui-workbench-scrollbar">
        {groups.map((group) => {
          const titleId = `${generatedId}-${group.id}-title`;

          return (
            <section
              key={group.id}
              id={`${generatedId}-${group.id}`}
              className="ui-workbench-command-group-shell__section"
              aria-labelledby={titleId}
            >
              <div className="ui-workbench-command-group-shell__section-header">
                <h2 id={titleId}>{group.label}</h2>
                {showGroupCounts ? <span>{group.commands.length}</span> : null}
              </div>
              <WorkbenchCommandList
                activeCommandId={activeCommandId}
                aria-label={`${group.label} commands`}
                commands={group.commands}
                emptyLabel={emptyLabel}
                query={query}
                source="grouped-list"
                onActiveCommandChange={onActiveCommandChange}
                onRunCommand={(command, context) =>
                  onRunCommand?.(command, {
                    ...context,
                    groupId: group.id,
                    groupLabel: group.label,
                  })
                }
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
