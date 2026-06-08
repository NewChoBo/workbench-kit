import type {
  WidgetInspectorField,
  WidgetInspectorSection,
  WidgetRegistryContract,
} from '@workbench-kit/contracts';
import { useState } from 'react';
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
  WorkbenchSectionTitle,
} from '../layout/WorkbenchPropertyPanel';
import type { InspectorAssetOption } from '../authoring/InspectorAssetPickerRow.js';
import { InspectorAssetPickerRow } from '../authoring/InspectorAssetPickerRow.js';
import { type InspectorPanelMode, isSimpleInspectorProp } from '../authoring/inspector-mode.js';
import { PlaygroundPlacementSections } from './playground/PlaygroundPlacementSections.js';

export interface WidgetInspectorPanelProps {
  imageSrcAssets?: readonly InspectorAssetOption[] | undefined;
  inspectorMode?: InspectorPanelMode | undefined;
  widget: GenericWidget | null;
  path: WidgetPath | null;
  parentWidget?: GenericWidget | null | undefined;
  selectedCount?: number | undefined;
  widgetRegistry?: WidgetRegistryContract<unknown> | undefined;
  readOnly?: boolean | undefined;
  onPatch?: ((next: GenericWidget) => void) | undefined;
}

export function WidgetInspectorPanel({
  imageSrcAssets,
  inspectorMode = 'simple',
  widget,
  path,
  parentWidget = null,
  selectedCount = 1,
  widgetRegistry,
  readOnly = false,
  onPatch,
}: WidgetInspectorPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inspector = widget ? widgetRegistry?.definition(widget.type)?.inspector : undefined;
  const isSimple = inspectorMode === 'simple';

  const updateWidget = (next: GenericWidget) => {
    if (!widget || !path || !onPatch || readOnly) return;
    onPatch(next);
  };

  const updateProp = (prop: string, value: unknown) => {
    if (!widget || !path || !onPatch || readOnly) return;

    if (widget.type === 'tile' && prop === 'layerColor' && typeof value === 'string') {
      const layers = Array.isArray(widget.layers) ? [...widget.layers] : [];
      const first: Record<string, unknown> =
        layers[0] && typeof layers[0] === 'object'
          ? { ...(layers[0] as Record<string, unknown>) }
          : { type: 'color' };
      first.type = 'color';
      first.color = value;
      const nextLayers = layers.length > 0 ? [first, ...layers.slice(1)] : [first];
      onPatch({ ...widget, layers: nextLayers });
      return;
    }

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
        <div className="ui-json-widget-inspector-panel__empty">
          <span className="ui-json-widget-inspector-panel__empty-icon" aria-hidden>
            ◇
          </span>
          <WorkbenchPropertyHint>
            Select a layer on the canvas or in the tree to edit its properties.
          </WorkbenchPropertyHint>
        </div>
      ) : selectedCount > 1 ? (
        <WorkbenchPropertyHint data-testid="inspector-multi-select-hint">
          {selectedCount} widgets selected. Edit one widget at a time or use bulk delete/duplicate
          from the toolbar.
        </WorkbenchPropertyHint>
      ) : (
        <WorkbenchPropertyStack>
          <Badge>{widget.type}</Badge>
          {typeof widget.id === 'string' && widget.id.trim().length > 0 ? (
            <WorkbenchPropertyHint title={widget.id}>{widget.id}</WorkbenchPropertyHint>
          ) : null}

          <WorkbenchPropertySection title="Widget">
            <WorkbenchPropertyTextRow
              label="Label"
              placeholder="Tree display name"
              readOnly={readOnly}
              value={typeof widget.label === 'string' ? widget.label : ''}
              onValueChange={(label) => updateProp('label', label)}
            />
            <WorkbenchPropertyCheckboxRow
              checked={widget.hidden === true}
              disabled={readOnly}
              label="Hidden"
              onCheckedChange={(hidden) => updateProp('hidden', hidden)}
            />
            <WorkbenchPropertyCheckboxRow
              checked={widget.locked === true}
              disabled={readOnly}
              label="Locked"
              onCheckedChange={(locked) => updateProp('locked', locked)}
            />
          </WorkbenchPropertySection>

          {inspector && inspector.length > 0 ? (
            inspector.map((section) => (
              <InspectorSection
                key={section.title}
                imageSrcAssets={imageSrcAssets}
                readOnly={readOnly}
                section={section}
                simpleMode={isSimple}
                showAdvanced={showAdvanced}
                values={widget}
                widgetType={widget.type}
                onValueChange={updateProp}
              />
            ))
          ) : (
            <WorkbenchPropertyHint>
              No inspector metadata registered for this widget type.
            </WorkbenchPropertyHint>
          )}

          {isSimple ? (
            <div className="ui-json-widget-inspector-panel__advanced-toggle">
              <Button
                compact
                data-testid="inspector-toggle-advanced"
                onClick={() => setShowAdvanced((current) => !current)}
              >
                {showAdvanced ? 'Hide advanced' : 'Show advanced properties'}
              </Button>
            </div>
          ) : null}

          {!isSimple || showAdvanced ? (
            <PlaygroundPlacementSections
              parentWidget={parentWidget}
              readOnly={readOnly}
              widget={widget}
              onUpdate={updateWidget}
            />
          ) : null}
        </WorkbenchPropertyStack>
      )}
    </WorkbenchPropertyPanel>
  );
}

function InspectorSection({
  imageSrcAssets,
  onValueChange,
  readOnly,
  section,
  showAdvanced,
  simpleMode,
  values,
  widgetType,
}: {
  imageSrcAssets?: readonly InspectorAssetOption[] | undefined;
  onValueChange: (prop: string, value: unknown) => void;
  readOnly: boolean;
  section: WidgetInspectorSection;
  showAdvanced: boolean;
  simpleMode: boolean;
  values: GenericWidget;
  widgetType: string;
}) {
  const visibleFields = section.fields.filter((field) => {
    if (!simpleMode || showAdvanced) return true;
    return isSimpleInspectorProp(widgetType, field.prop);
  });

  if (visibleFields.length === 0) return null;

  return (
    <WorkbenchPropertySection title={section.title}>
      {visibleFields.map((field) => (
        <InspectorField
          key={field.prop}
          field={field}
          imageSrcAssets={imageSrcAssets}
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
  imageSrcAssets,
  onValueChange,
  readOnly,
  value,
  values,
}: {
  field: WidgetInspectorField;
  imageSrcAssets?: readonly InspectorAssetOption[] | undefined;
  onValueChange: (prop: string, value: unknown) => void;
  readOnly: boolean;
  value: unknown;
  values: GenericWidget;
}) {
  if (
    field.prop === 'src' &&
    values.type === 'image' &&
    imageSrcAssets &&
    imageSrcAssets.length > 0
  ) {
    return (
      <InspectorAssetPickerRow
        assets={imageSrcAssets}
        label={field.label}
        readOnly={readOnly}
        value={typeof value === 'string' ? value : ''}
        onValueChange={(next) => onValueChange(field.prop, next)}
      />
    );
  }

  if (field.prop === 'layerColor' && values.type === 'tile') {
    const layers = values.layers;
    const firstLayer =
      Array.isArray(layers) && layers[0] && typeof layers[0] === 'object'
        ? (layers[0] as { color?: string })
        : undefined;
    const layerColor = typeof firstLayer?.color === 'string' ? firstLayer.color : '';
    return (
      <WorkbenchPropertyColorRow
        label={field.label}
        value={layerColor}
        onValueChange={(next) => onValueChange(field.prop, next)}
      />
    );
  }

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
