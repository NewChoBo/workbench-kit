import type {
  WidgetInspectorField,
  WidgetInspectorSection,
  WidgetRegistryContract,
} from '@workbench-kit/contracts';
import type { GenericWidget, WidgetPath } from '@workbench-kit/json-widget';

import { Badge } from '../primitives/Badge';
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
  WorkbenchSectionTitle,
} from '../layout/WorkbenchPropertyPanel';
import { PlaygroundPlacementSections } from './PlaygroundPlacementSections.js';

export interface WidgetInspectorPanelProps {
  widget: GenericWidget | null;
  path: WidgetPath | null;
  parentWidget?: GenericWidget | null | undefined;
  widgetRegistry?: WidgetRegistryContract<unknown> | undefined;
  readOnly?: boolean | undefined;
  onPatch?: ((next: GenericWidget) => void) | undefined;
}

export function WidgetInspectorPanel({
  widget,
  path,
  parentWidget = null,
  widgetRegistry,
  readOnly = false,
  onPatch,
}: WidgetInspectorPanelProps) {
  const inspector = widget ? widgetRegistry?.definition(widget.type)?.inspector : undefined;

  const updateWidget = (next: GenericWidget) => {
    if (!widget || !path || !onPatch || readOnly) return;
    onPatch(next);
  };

  const updateProp = (prop: string, value: unknown) => {
    if (!widget || !path || !onPatch || readOnly) return;

    if (widget.type === 'box' && (prop === 'borderColor' || prop === 'borderWidth')) {
      const border =
        widget.border && typeof widget.border === 'object'
          ? { ...(widget.border as Record<string, unknown>) }
          : {};
      if (prop === 'borderColor' && typeof value === 'string') {
        border.color = value;
      }
      if (prop === 'borderWidth' && typeof value === 'number') {
        border.width = value;
      }
      onPatch({ ...widget, border });
      return;
    }

    onPatch({ ...widget, [prop]: value });
  };

  return (
    <WorkbenchPropertyPanel className="ui-json-widget-inspector-panel">
      <WorkbenchSectionTitle>Inspector</WorkbenchSectionTitle>

      {!widget ? (
        <WorkbenchPropertyHint>
          Select a widget node to inspect its properties.
        </WorkbenchPropertyHint>
      ) : (
        <WorkbenchPropertyStack>
          <Badge>{widget.type}</Badge>
          {typeof widget.id === 'string' && widget.id.trim().length > 0 ? (
            <WorkbenchPropertyHint title={widget.id}>{widget.id}</WorkbenchPropertyHint>
          ) : null}

          {inspector && inspector.length > 0 ? (
            inspector.map((section) => (
              <InspectorSection
                key={section.title}
                readOnly={readOnly}
                section={section}
                values={widget}
                onValueChange={updateProp}
              />
            ))
          ) : (
            <WorkbenchPropertyHint>
              No inspector metadata registered for this widget type.
            </WorkbenchPropertyHint>
          )}

          <PlaygroundPlacementSections
            parentWidget={parentWidget}
            readOnly={readOnly}
            widget={widget}
            onUpdate={updateWidget}
          />
        </WorkbenchPropertyStack>
      )}
    </WorkbenchPropertyPanel>
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
          values={values}
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
  values,
}: {
  field: WidgetInspectorField;
  onValueChange: (prop: string, value: unknown) => void;
  readOnly: boolean;
  value: unknown;
  values: GenericWidget;
}) {
  if (field.prop === 'borderColor') {
    const border = values.border as { color?: string; width?: number } | undefined;
    const borderColor = typeof border?.color === 'string' ? border.color : '';
    return (
      <WorkbenchPropertyColorRow
        label={field.label}
        value={borderColor}
        onValueChange={(next) => onValueChange(field.prop, next)}
      />
    );
  }

  if (field.prop === 'borderWidth' && field.kind === 'number') {
    const border = values.border as { color?: string; width?: number } | undefined;
    const borderWidth = typeof border?.width === 'number' ? border.width : undefined;
    return (
      <WorkbenchPropertyNumberRow
        label={field.label}
        disabled={readOnly}
        min={field.min}
        max={field.max}
        step={field.step}
        value={borderWidth}
        onValueChange={(next) => onValueChange(field.prop, next)}
      />
    );
  }

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
