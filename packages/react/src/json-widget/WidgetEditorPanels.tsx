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

export interface WidgetInspectorPanelProps {
  widget: GenericWidget | null;
  path: WidgetPath | null;
  widgetRegistry?: WidgetRegistryContract<unknown> | undefined;
  readOnly?: boolean | undefined;
  onPatch?: ((next: GenericWidget) => void) | undefined;
}

export function WidgetInspectorPanel({
  widget,
  path,
  widgetRegistry,
  readOnly = false,
  onPatch,
}: WidgetInspectorPanelProps) {
  const inspector = widget ? widgetRegistry?.definition(widget.type)?.inspector : undefined;

  const updateProp = (prop: string, value: unknown) => {
    if (!widget || !path || !onPatch || readOnly) return;
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
          onValueChange={(next) => onValueChange(field.prop, next)}
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
  onValueChange: (value: unknown) => void;
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
        onValueChange={onValueChange}
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
        onValueChange={onValueChange}
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
        onValueChange={onValueChange}
      />
    );
  }

  return (
    <WorkbenchPropertyCheckboxRow
      label={field.label}
      disabled={readOnly}
      checked={typeof value === 'boolean' ? value : false}
      onCheckedChange={onValueChange}
    />
  );
}
