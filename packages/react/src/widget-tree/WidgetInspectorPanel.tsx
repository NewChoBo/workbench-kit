import type {
  WidgetInspectorField,
  WidgetInspectorSection,
  WidgetRegistryContract,
} from '@workbench-kit/contracts';
import type { GenericWidget, WidgetPath } from '@workbench-kit/json-widget';

import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import {
  WorkbenchPropertyCheckboxRow,
  WorkbenchPropertyColorRow,
  WorkbenchPropertyHint,
  WorkbenchPropertyNumberRow,
  WorkbenchPropertyPanel,
  WorkbenchPropertySection,
  WorkbenchPropertySelectRow,
  WorkbenchPropertyStack,
  WorkbenchPropertyTextRow,
} from '../layout/WorkbenchPropertyPanel';

export interface WidgetInspectorPanelProps {
  readonly widget: GenericWidget | null;
  readonly path: WidgetPath | null;
  readonly parentWidget?: GenericWidget | null | undefined;
  readonly widgetRegistry?: WidgetRegistryContract<unknown> | undefined;
  readonly readOnly?: boolean | undefined;
  readonly onPatch?: ((next: GenericWidget) => void) | undefined;
  readonly onRemove?: (() => void) | undefined;
}

export function WidgetInspectorPanel({
  widget,
  path,
  parentWidget = null,
  widgetRegistry,
  readOnly = false,
  onPatch,
  onRemove,
}: WidgetInspectorPanelProps) {
  const inspector = widget ? widgetRegistry?.definition(widget.type)?.inspector : undefined;
  const parentType = parentWidget?.type;
  const showPlacement =
    widget &&
    parentType &&
    (parentType === 'grid' || parentType === 'row' || parentType === 'column');

  const updateProp = (prop: string, value: unknown) => {
    if (!widget || !path || !onPatch || readOnly) return;
    onPatch({ ...widget, [prop]: value });
  };

  return (
    <WorkbenchPropertyPanel
      className="widget-tree-inspector"
      data-testid="widget-tree-inspector-panel"
    >
      {!widget ? (
        <WorkbenchPropertyHint>Select a node in the outline.</WorkbenchPropertyHint>
      ) : (
        <WorkbenchPropertyStack>
          <div className="widget-tree-inspector__header">
            <Badge>{widgetRegistry?.definition(widget.type)?.displayName ?? widget.type}</Badge>
            {typeof widget.id === 'string' && widget.id.trim().length > 0 ? (
              <WorkbenchPropertyHint title={widget.id}>{widget.id}</WorkbenchPropertyHint>
            ) : null}
          </div>

          {showPlacement ? (
            <PlacementSection
              parentType={parentType}
              readOnly={readOnly}
              values={widget}
              onValueChange={updateProp}
            />
          ) : null}

          {inspector && inspector.length > 0
            ? inspector.map((section) => (
                <InspectorSection
                  key={section.title}
                  readOnly={readOnly}
                  section={section}
                  values={widget}
                  onValueChange={updateProp}
                />
              ))
            : !showPlacement ? (
                <WorkbenchPropertyHint>
                  No property fields registered for this widget type.
                </WorkbenchPropertyHint>
              ) : null}

          {path && path.length > 0 && onRemove ? (
            <div className="widget-tree-inspector__danger">
              <Button disabled={readOnly} variant="danger" onClick={onRemove}>
                Remove node
              </Button>
            </div>
          ) : null}
        </WorkbenchPropertyStack>
      )}
    </WorkbenchPropertyPanel>
  );
}

function PlacementSection({
  onValueChange,
  parentType,
  readOnly,
  values,
}: {
  onValueChange: (prop: string, value: unknown) => void;
  parentType: string;
  readOnly: boolean;
  values: GenericWidget;
}) {
  if (parentType === 'grid') {
    return (
      <WorkbenchPropertySection title="Grid placement">
        <WorkbenchPropertyNumberRow
          label="Column"
          disabled={readOnly}
          min={0}
          value={typeof values.col === 'number' ? values.col : undefined}
          onValueChange={(next) => onValueChange('col', next)}
        />
        <WorkbenchPropertyNumberRow
          label="Row"
          disabled={readOnly}
          min={0}
          value={typeof values.row === 'number' ? values.row : undefined}
          onValueChange={(next) => onValueChange('row', next)}
        />
        <WorkbenchPropertyNumberRow
          label="Column span"
          disabled={readOnly}
          min={1}
          value={typeof values.colSpan === 'number' ? values.colSpan : undefined}
          onValueChange={(next) => onValueChange('colSpan', next)}
        />
        <WorkbenchPropertyNumberRow
          label="Row span"
          disabled={readOnly}
          min={1}
          value={typeof values.rowSpan === 'number' ? values.rowSpan : undefined}
          onValueChange={(next) => onValueChange('rowSpan', next)}
        />
      </WorkbenchPropertySection>
    );
  }

  return (
    <WorkbenchPropertySection title="Flex placement">
      <WorkbenchPropertyNumberRow
        label="Flex"
        disabled={readOnly}
        min={0}
        step={0.1}
        value={typeof values.flex === 'number' ? values.flex : undefined}
        onValueChange={(next) => onValueChange('flex', next)}
      />
      <WorkbenchPropertySelectRow
        label="Align"
        disabled={readOnly}
        options={[
          { label: 'Auto', value: '' },
          { label: 'Start', value: 'flex-start' },
          { label: 'Center', value: 'center' },
          { label: 'End', value: 'flex-end' },
          { label: 'Stretch', value: 'stretch' },
        ]}
        value={typeof values.align === 'string' ? values.align : ''}
        onValueChange={(next) => onValueChange('align', next.length > 0 ? next : undefined)}
      />
    </WorkbenchPropertySection>
  );
}

function InspectorSection({
  onValueChange,
  readOnly,
  section,
  values,
}: {
  onValueChange: (prop: string, value: unknown) => void;
  readOnly: boolean;
  section: WidgetInspectorSection;
  values: GenericWidget;
}) {
  return (
    <WorkbenchPropertySection title={section.title}>
      {section.fields.map((field) => (
        <InspectorField
          key={field.prop}
          field={field}
          readOnly={readOnly}
          value={values[field.prop]}
          onValueChange={(prop, next) => onValueChange(prop, next)}
        />
      ))}
    </WorkbenchPropertySection>
  );
}

function InspectorField({
  field,
  onValueChange,
  readOnly,
  value,
}: {
  field: WidgetInspectorField;
  onValueChange: (prop: string, value: unknown) => void;
  readOnly: boolean;
  value: unknown;
}) {
  if (field.kind === 'text' || field.kind === 'color') {
    const Row = field.kind === 'color' ? WorkbenchPropertyColorRow : WorkbenchPropertyTextRow;
    return (
      <Row
        label={field.label}
        readOnly={readOnly}
        value={typeof value === 'string' ? value : ''}
        {...(field.kind === 'text' && field.placeholder
          ? { placeholder: field.placeholder }
          : null)}
        onValueChange={(next) => onValueChange(field.prop, next)}
      />
    );
  }

  if (field.kind === 'number') {
    return (
      <WorkbenchPropertyNumberRow
        label={field.label}
        disabled={readOnly}
        max={field.max}
        min={field.min}
        step={field.step}
        value={typeof value === 'number' ? value : undefined}
        onValueChange={(next) => onValueChange(field.prop, next)}
      />
    );
  }

  if (field.kind === 'select') {
    return (
      <WorkbenchPropertySelectRow
        label={field.label}
        disabled={readOnly}
        options={field.options}
        value={typeof value === 'string' ? value : undefined}
        onValueChange={(next) => onValueChange(field.prop, next)}
      />
    );
  }

  return (
    <WorkbenchPropertyCheckboxRow
      label={field.label}
      disabled={readOnly}
      checked={typeof value === 'boolean' ? value : false}
      onCheckedChange={(next) => onValueChange(field.prop, next)}
    />
  );
}
