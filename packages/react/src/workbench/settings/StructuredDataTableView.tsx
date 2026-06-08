import type { ComponentPropsWithRef, ReactNode } from 'react';
import { EmptyState } from '../../primitives/EmptyState';
import { cx } from '../../utils/cx';
import {
  getWorkbenchStructuredDataValue,
  type WorkbenchStructuredDataRecord,
  type WorkbenchStructuredDataTable,
  type WorkbenchStructuredDataTableCellContext,
  type WorkbenchStructuredDataTableColumn,
} from './structuredDataSchema';

export interface WorkbenchStructuredDataTableViewProps extends Omit<
  ComponentPropsWithRef<'section'>,
  'children'
> {
  table: WorkbenchStructuredDataTable;
}

export function buildWorkbenchStructuredDataTableFromRecords({
  columns,
  emptyLabel = 'No rows',
  id = 'table',
  label,
  rows,
}: {
  columns: readonly string[];
  emptyLabel?: ReactNode;
  id?: string;
  label?: ReactNode;
  rows: readonly WorkbenchStructuredDataRecord[];
}): WorkbenchStructuredDataTable {
  return {
    columns: columns.map((column) => ({
      id: column,
      label: column,
      path: [column],
    })),
    emptyLabel,
    id,
    label,
    rows: rows.map((data, index) => ({
      data,
      id: String(index),
    })),
  };
}

export function formatWorkbenchStructuredDataTableCell(value: unknown) {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length === 0 ? '-' : value.join(', ');
  return String(value);
}

function renderCell(
  column: WorkbenchStructuredDataTableColumn,
  context: WorkbenchStructuredDataTableCellContext,
) {
  return column.render?.(context) ?? formatWorkbenchStructuredDataTableCell(context.value);
}

export function WorkbenchStructuredDataTableView({
  className,
  table,
  ...props
}: WorkbenchStructuredDataTableViewProps) {
  const hasHeader = Boolean(table.label || table.description);

  return (
    <section
      className={cx(
        'ui-workbench-structured-data-table-view',
        hasHeader && 'ui-workbench-structured-data-table-view--with-header',
        className,
      )}
      {...props}
    >
      {table.label ? <h3 className="ui-workbench-structured-data-table-view__label">{table.label}</h3> : null}
      {table.description ? (
        <p className="ui-workbench-structured-data-table-view__description">{table.description}</p>
      ) : null}
      {table.rows.length === 0 ? (
        <EmptyState compact icon="codicon-table">
          {table.emptyLabel ?? 'No rows'}
        </EmptyState>
      ) : (
        <div className="ui-workbench-structured-data-table-view__scroll">
          <table className="ui-workbench-structured-data-table-view__table">
            <thead>
              <tr>
                {table.columns.map((column) => (
                  <th key={column.id} data-align={column.align}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.id}>
                  {table.columns.map((column) => {
                    const value = column.path
                      ? getWorkbenchStructuredDataValue(row.data, column.path)
                      : undefined;

                    return (
                      <td key={column.id} data-align={column.align}>
                        {renderCell(column, { column, row, value })}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
