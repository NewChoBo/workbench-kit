import { useId, type ReactNode } from 'react';
import { Button } from '../../primitives/Button';
import { Field } from '../../primitives/Field';
import { IconButton } from '../../primitives/IconButton';
import { cx } from '../../utils/cx';
import { WorkbenchSectionedPanel } from './SectionedPanel';
import {
  WorkbenchStructuredDataSchemaFieldInput,
  appendWorkbenchStructuredDataSchemaTableRow,
  asWorkbenchStructuredDataRecord,
  createWorkbenchStructuredDataSchemaDocumentEmptyRow,
  createWorkbenchStructuredDataSchemaFallbackSection,
  formatWorkbenchStructuredDataSchemaLabel,
  formatWorkbenchStructuredDataSchemaValue,
  getWorkbenchStructuredDataSchemaDocumentColumnDefinition,
  getWorkbenchStructuredDataSchemaDocumentColumnLabel,
  getWorkbenchStructuredDataSchemaDocumentFieldLabel,
  getWorkbenchStructuredDataSchemaDocumentPanelData,
  getWorkbenchStructuredDataSchemaDocumentSectionValue,
  getWorkbenchStructuredDataSchemaDocumentSections,
  getWorkbenchStructuredDataSchemaDocumentTableColumns,
  getWorkbenchStructuredDataSchemaFieldDataPath,
  getWorkbenchStructuredDataSchemaFieldDescription,
  getWorkbenchStructuredDataSchemaSectionAnchorId,
  getWorkbenchStructuredDataSchemaSectionId,
  getWorkbenchStructuredDataSchemaTableCellPath,
  getWorkbenchStructuredDataSchemaTablePath,
  getWorkbenchStructuredDataSchemaTableRowKey,
  getWorkbenchStructuredDataSchemaTableRows,
  getWorkbenchStructuredDataValue,
  removeWorkbenchStructuredDataSchemaTableRow,
  setWorkbenchStructuredDataPathOrRootValue,
  type WorkbenchStructuredDataSchemaDocument,
  type WorkbenchStructuredDataSchemaSectionAliases,
  type WorkbenchStructuredDataSchemaSectionSummary,
  type WorkbenchStructuredDataPath,
} from './StructuredDataForm';

export interface WorkbenchStructuredDataSchemaPanelClassNames {
  checkbox?: string | undefined;
  empty?: string | undefined;
  field?: string | undefined;
  fieldInput?: string | undefined;
  root?: string | undefined;
  section?: string | undefined;
  sectionActions?: string | undefined;
  sectionHeader?: string | undefined;
  settingControl?: string | undefined;
  settingControlTextarea?: string | undefined;
  settingRow?: string | undefined;
  settingsList?: string | undefined;
  tableActions?: string | undefined;
  tableEditor?: string | undefined;
  tableFooter?: string | undefined;
  tableGrid?: string | undefined;
  tableHeaderRow?: string | undefined;
  tableRow?: string | undefined;
  tableScroll?: string | undefined;
}

export interface WorkbenchStructuredDataSchemaPanelLabels {
  addRow?: ReactNode | undefined;
  addTextArrayItem?: ReactNode | undefined;
  deleteRow?: string | undefined;
  removeTextArrayItem?: string | undefined;
}

export interface WorkbenchStructuredDataSchemaPanelProps {
  activePattern?: string | undefined;
  ariaLabel: string;
  classNames?: WorkbenchStructuredDataSchemaPanelClassNames | undefined;
  data: unknown;
  headerActions?: ReactNode | undefined;
  labels?: WorkbenchStructuredDataSchemaPanelLabels | undefined;
  preferredTableColumns?: readonly string[] | undefined;
  readOnly?: boolean | undefined;
  schema: WorkbenchStructuredDataSchemaDocument | null | undefined;
  sectionValueAliases?: WorkbenchStructuredDataSchemaSectionAliases | undefined;
  titleFallback?: string | undefined;
  onDataChange?: ((data: unknown) => void) | undefined;
}

interface WorkbenchStructuredDataSchemaSectionView {
  data: unknown;
  schema: WorkbenchStructuredDataSchemaDocument | null | undefined;
  section: WorkbenchStructuredDataSchemaSectionSummary;
  value: unknown;
}

const defaultSchemaPanelClassNames: Required<WorkbenchStructuredDataSchemaPanelClassNames> = {
  checkbox: 'ui-workbench-structured-data-schema-panel__checkbox',
  empty: 'ui-workbench-structured-data-schema-panel__empty',
  field: 'ui-workbench-structured-data-schema-panel__field',
  fieldInput: 'ui-workbench-structured-data-schema-panel__field-input',
  root: 'ui-workbench-structured-data-schema-panel',
  section: 'ui-workbench-structured-data-schema-panel__section',
  sectionActions: 'ui-workbench-structured-data-schema-panel__section-actions',
  sectionHeader: 'ui-workbench-structured-data-schema-panel__section-header',
  settingControl: 'ui-workbench-structured-data-schema-panel__control',
  settingControlTextarea: 'ui-workbench-structured-data-schema-panel__control--textarea',
  settingRow: 'ui-workbench-structured-data-schema-panel__setting-row',
  settingsList: 'ui-workbench-structured-data-schema-panel__settings-list',
  tableActions: 'ui-workbench-structured-data-schema-panel__table-actions',
  tableEditor: 'ui-workbench-structured-data-schema-panel__table-editor',
  tableFooter: 'ui-workbench-structured-data-schema-panel__table-footer',
  tableGrid: 'ui-workbench-structured-data-schema-panel__table-grid',
  tableHeaderRow:
    'ui-workbench-structured-data-schema-panel__table-row ui-workbench-structured-data-schema-panel__table-row--head',
  tableRow: 'ui-workbench-structured-data-schema-panel__table-row',
  tableScroll: 'ui-workbench-structured-data-schema-panel__table-scroll',
};

function resolveSchemaPanelClassNames(
  classNames: WorkbenchStructuredDataSchemaPanelClassNames | undefined,
): Required<WorkbenchStructuredDataSchemaPanelClassNames> {
  return Object.fromEntries(
    Object.entries(defaultSchemaPanelClassNames).map(([key, className]) => [
      key,
      cx(className, classNames?.[key as keyof WorkbenchStructuredDataSchemaPanelClassNames]),
    ]),
  ) as Required<WorkbenchStructuredDataSchemaPanelClassNames>;
}

function getSchemaFieldValue({
  data,
  fieldPath,
  section,
  sectionValue,
}: {
  data: unknown;
  fieldPath: string;
  section: WorkbenchStructuredDataSchemaSectionSummary;
  sectionValue: unknown;
}) {
  const fullPath = getWorkbenchStructuredDataSchemaFieldDataPath(section, fieldPath);
  const rootValue = getWorkbenchStructuredDataValue(data, fullPath.split('.'));
  if (rootValue !== null && rootValue !== undefined) return rootValue;

  const record = asWorkbenchStructuredDataRecord(sectionValue);
  return record?.[fieldPath] ?? null;
}

function renderSchemaFormSection({
  classNames = {},
  data,
  labels = {},
  onDataValueChange,
  readOnly,
  schema,
  section,
  value,
}: WorkbenchStructuredDataSchemaSectionView & {
  classNames?: WorkbenchStructuredDataSchemaPanelClassNames | undefined;
  labels?: WorkbenchStructuredDataSchemaPanelLabels | undefined;
  onDataValueChange: (path: string[], value: unknown) => void;
  readOnly: boolean;
}) {
  const fields = section.fields ?? [];
  if (fields.length) {
    return (
      <div className={classNames.settingsList}>
        {fields.map((fieldPath) => {
          const definition = getWorkbenchStructuredDataSchemaDocumentColumnDefinition(
            schema,
            section,
            fieldPath,
          );
          const dataPath = getWorkbenchStructuredDataSchemaFieldDataPath(section, fieldPath);

          return (
            <div key={fieldPath} className={classNames.settingRow}>
              <Field
                className={classNames.field}
                description={getWorkbenchStructuredDataSchemaFieldDescription(definition)}
                label={getWorkbenchStructuredDataSchemaDocumentFieldLabel(
                  schema,
                  section,
                  fieldPath,
                )}
              >
                <div className={classNames.fieldInput}>
                  <WorkbenchStructuredDataSchemaFieldInput
                    addTextArrayLabel={labels.addTextArrayItem}
                    checkboxClassName={classNames.checkbox}
                    className={classNames.settingControl}
                    definition={definition}
                    fieldPath={dataPath}
                    readOnly={readOnly}
                    removeTextArrayLabel={labels.removeTextArrayItem}
                    textareaClassName={classNames.settingControlTextarea}
                    value={getSchemaFieldValue({ data, fieldPath, section, sectionValue: value })}
                    onValueChange={(nextValue) => onDataValueChange(dataPath.split('.'), nextValue)}
                  />
                </div>
              </Field>
            </div>
          );
        })}
      </div>
    );
  }

  const record = asWorkbenchStructuredDataRecord(value);
  if (!record) {
    return <p className={classNames.empty}>{formatWorkbenchStructuredDataSchemaValue(value)}</p>;
  }

  return (
    <div className={classNames.settingsList}>
      {Object.entries(record)
        .slice(0, 10)
        .map(([key, entry]) => (
          <div key={key} className={classNames.settingRow}>
            <Field
              className={classNames.field}
              label={formatWorkbenchStructuredDataSchemaLabel(key)}
            >
              <div className={classNames.fieldInput}>
                <WorkbenchStructuredDataSchemaFieldInput
                  checkboxClassName={classNames.checkbox}
                  className={classNames.settingControl}
                  definition={undefined}
                  fieldPath={key}
                  readOnly={readOnly}
                  textareaClassName={classNames.settingControlTextarea}
                  value={entry}
                  onValueChange={(nextValue) =>
                    onDataValueChange(
                      getWorkbenchStructuredDataSchemaFieldDataPath(section, key).split('.'),
                      nextValue,
                    )
                  }
                />
              </div>
            </Field>
          </div>
        ))}
    </div>
  );
}

function renderSchemaTableSection({
  classNames = {},
  labels = {},
  onDataValueChange,
  preferredTableColumns = [],
  readOnly,
  schema,
  section,
  value,
  ...sectionView
}: WorkbenchStructuredDataSchemaSectionView & {
  classNames?: WorkbenchStructuredDataSchemaPanelClassNames | undefined;
  labels?: WorkbenchStructuredDataSchemaPanelLabels | undefined;
  onDataValueChange: (path: string[], value: unknown) => void;
  preferredTableColumns?: readonly string[] | undefined;
  readOnly: boolean;
}) {
  const rows = getWorkbenchStructuredDataSchemaTableRows(value);
  const columns = getWorkbenchStructuredDataSchemaDocumentTableColumns({
    preferredColumns: preferredTableColumns,
    rows,
    schema,
    section,
  });
  if (!rows.length || !columns.length) {
    return renderSchemaFormSection({
      ...sectionView,
      classNames,
      labels,
      onDataValueChange,
      readOnly,
      schema,
      section,
      value,
    });
  }

  const tablePathSegments = getWorkbenchStructuredDataSchemaTablePath(section);
  const isArrayTable = Array.isArray(value);

  return (
    <div className={classNames.tableEditor}>
      <div className={classNames.tableScroll}>
        <div className={classNames.tableGrid} role="table">
          <div className={classNames.tableHeaderRow} role="row">
            {columns.map((column) => (
              <span key={column} role="columnheader">
                {getWorkbenchStructuredDataSchemaDocumentColumnLabel(schema, section, column)}
              </span>
            ))}
            {readOnly ? null : <span role="columnheader">Actions</span>}
          </div>
          {rows.slice(0, 12).map((row, rowIndex) => {
            const rowKey = getWorkbenchStructuredDataSchemaTableRowKey({ row, rowIndex, value });

            return (
              <div key={rowKey} className={classNames.tableRow} role="row">
                {columns.map((column) => (
                  <span key={column} role="cell">
                    <WorkbenchStructuredDataSchemaFieldInput
                      addTextArrayLabel={labels.addTextArrayItem}
                      checkboxClassName={classNames.checkbox}
                      className={classNames.settingControl}
                      definition={getWorkbenchStructuredDataSchemaDocumentColumnDefinition(
                        schema,
                        section,
                        column,
                      )}
                      fieldPath={column}
                      readOnly={readOnly}
                      removeTextArrayLabel={labels.removeTextArrayItem}
                      textareaClassName={classNames.settingControlTextarea}
                      value={row[column]}
                      onValueChange={(nextValue) => {
                        onDataValueChange(
                          getWorkbenchStructuredDataSchemaTableCellPath({
                            column,
                            rowKey,
                            section,
                          }),
                          nextValue,
                        );
                      }}
                    />
                  </span>
                ))}
                {readOnly ? null : (
                  <span className={classNames.tableActions} role="cell">
                    <IconButton
                      compact
                      icon="trash"
                      label={labels.deleteRow ?? 'Delete row'}
                      onClick={() => {
                        onDataValueChange(
                          tablePathSegments,
                          removeWorkbenchStructuredDataSchemaTableRow({
                            rowIndex,
                            rowKey,
                            value,
                          }),
                        );
                      }}
                    />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {readOnly ? null : (
        <div className={classNames.tableFooter}>
          <Button
            onClick={() => {
              const emptyRow = createWorkbenchStructuredDataSchemaDocumentEmptyRow({
                columns,
                schema,
                section,
              });
              if (isArrayTable && Array.isArray(value)) {
                onDataValueChange(
                  tablePathSegments,
                  appendWorkbenchStructuredDataSchemaTableRow({
                    row: emptyRow,
                    rowKey: '',
                    value,
                  }),
                );
                return;
              }

              const nextKey = `row_${Date.now()}`;
              onDataValueChange(
                tablePathSegments,
                appendWorkbenchStructuredDataSchemaTableRow({
                  row: emptyRow,
                  rowKey: nextKey,
                  value,
                }),
              );
            }}
          >
            {labels.addRow ?? 'Add row'}
          </Button>
        </div>
      )}
    </div>
  );
}

function renderSchemaPanelSection({
  anchorId,
  classNames = {},
  headerActions,
  labels,
  onDataValueChange,
  preferredTableColumns,
  readOnly,
  sectionView,
}: {
  anchorId?: string | undefined;
  classNames?: WorkbenchStructuredDataSchemaPanelClassNames | undefined;
  headerActions?: ReactNode | undefined;
  labels?: WorkbenchStructuredDataSchemaPanelLabels | undefined;
  onDataValueChange: (path: string[], value: unknown) => void;
  preferredTableColumns?: readonly string[] | undefined;
  readOnly: boolean;
  sectionView: WorkbenchStructuredDataSchemaSectionView;
}) {
  const { section, value } = sectionView;
  const isTable = section.type === 'table' || Array.isArray(value);
  const sectionId = getWorkbenchStructuredDataSchemaSectionId(section);

  return (
    <section
      key={anchorId ?? sectionId ?? section.title}
      className={classNames.section}
      id={anchorId}
    >
      <header className={classNames.sectionHeader}>
        <div>
          <h2>{section.title ?? sectionId ?? 'Data'}</h2>
        </div>
        {headerActions ? <div className={classNames.sectionActions}>{headerActions}</div> : null}
      </header>
      {isTable
        ? renderSchemaTableSection({
            ...sectionView,
            classNames,
            labels,
            onDataValueChange,
            preferredTableColumns,
            readOnly,
          })
        : renderSchemaFormSection({
            ...sectionView,
            classNames,
            labels,
            onDataValueChange,
            readOnly,
          })}
    </section>
  );
}

export function WorkbenchStructuredDataSchemaPanel({
  activePattern,
  ariaLabel,
  classNames,
  data,
  headerActions,
  labels,
  preferredTableColumns,
  readOnly = false,
  schema,
  sectionValueAliases,
  titleFallback = 'Data',
  onDataChange,
}: WorkbenchStructuredDataSchemaPanelProps) {
  const resolvedClassNames = resolveSchemaPanelClassNames(classNames);
  const panelId = useId().replace(/:/g, '');
  const pattern = activePattern ?? schema?.activePattern ?? schema?.pattern ?? 'DBtoDB';
  const panelData = getWorkbenchStructuredDataSchemaDocumentPanelData({ data, pattern, schema });
  const schemaSections = getWorkbenchStructuredDataSchemaDocumentSections(schema, pattern);
  const sections = schemaSections.length
    ? schemaSections
    : [
        createWorkbenchStructuredDataSchemaFallbackSection({
          data: panelData,
          title: titleFallback,
        }),
      ];
  const sectionItems = sections.map((section, index) => ({
    anchorId: getWorkbenchStructuredDataSchemaSectionAnchorId({ index, panelId, section }),
    count: section.fields?.length ?? section.columns?.length ?? section.fieldCount,
    section,
    title: section.title ?? getWorkbenchStructuredDataSchemaSectionId(section) ?? 'Data',
  }));

  const handleDataValueChange = (path: string[], value: unknown) => {
    if (readOnly) return;
    if (!path.length) {
      onDataChange?.(value);
      return;
    }

    let resolvedPath: WorkbenchStructuredDataPath = path;
    const [sectionKey, ...rest] = path;
    const aliases = sectionValueAliases?.[sectionKey];
    if (aliases && aliases.length > 0) {
      let foundAlias = false;
      for (const aliasPath of aliases) {
        if (aliasPath.length === 0) continue;
        const val = getWorkbenchStructuredDataValue(panelData, aliasPath);
        if (val !== null && val !== undefined) {
          resolvedPath = [...aliasPath, ...rest];
          foundAlias = true;
          break;
        }
      }
      if (!foundAlias) {
        const firstAlias = aliases[0];
        if (firstAlias !== undefined) {
          resolvedPath = [...firstAlias, ...rest];
        }
      }
    }

    onDataChange?.(
      setWorkbenchStructuredDataPathOrRootValue({
        data: panelData,
        path: resolvedPath,
        value,
      }),
    );
  };

  return (
    <WorkbenchSectionedPanel
      ariaLabel={ariaLabel}
      className={resolvedClassNames.root}
      items={sectionItems.map(({ anchorId, count, section, title }, index) => ({
        anchorId,
        count,
        title,
        render: () =>
          renderSchemaPanelSection({
            anchorId,
            classNames: resolvedClassNames,
            headerActions: index === 0 ? headerActions : undefined,
            labels,
            onDataValueChange: handleDataValueChange,
            preferredTableColumns,
            readOnly,
            sectionView: {
              data: panelData,
              schema,
              section,
              value: schemaSections.length
                ? getWorkbenchStructuredDataSchemaDocumentSectionValue({
                    aliases: sectionValueAliases,
                    data: panelData,
                    section,
                  })
                : panelData,
            },
          }),
      }))}
      readOnly={readOnly}
    />
  );
}
