import type { GenericWidget } from '@workbench-kit/json-widget';

import {
  WorkbenchPropertyGrid,
  WorkbenchPropertyNumberRow,
  WorkbenchPropertySection,
  WorkbenchPropertySelectRow,
} from '../../layout/WorkbenchPropertyPanel.js';

type WidgetUpdate = (next: GenericWidget) => void;

const LINEAR_ALIGN_OPTIONS = [
  { label: 'Stretch', value: 'stretch' },
  { label: 'Start', value: 'start' },
  { label: 'Center', value: 'center' },
  { label: 'End', value: 'end' },
] as const;

export function PlaygroundGridPlacementSection({
  readOnly,
  widget,
  onUpdate,
}: {
  readOnly: boolean;
  widget: GenericWidget;
  onUpdate: WidgetUpdate;
}) {
  return (
    <WorkbenchPropertySection title="Grid Position">
      <WorkbenchPropertyGrid columns={2}>
        <WorkbenchPropertyNumberRow
          disabled={readOnly}
          label="Col"
          min={0}
          value={typeof widget.col === 'number' ? widget.col : 0}
          onValueChange={(col) => onUpdate({ ...widget, col })}
        />
        <WorkbenchPropertyNumberRow
          disabled={readOnly}
          label="Row"
          min={0}
          value={typeof widget.row === 'number' ? widget.row : 0}
          onValueChange={(row) => onUpdate({ ...widget, row })}
        />
        <WorkbenchPropertyNumberRow
          disabled={readOnly}
          label="Col span"
          min={1}
          value={typeof widget.colSpan === 'number' ? widget.colSpan : 1}
          onValueChange={(colSpan) => onUpdate({ ...widget, colSpan })}
        />
        <WorkbenchPropertyNumberRow
          disabled={readOnly}
          label="Row span"
          min={1}
          value={typeof widget.rowSpan === 'number' ? widget.rowSpan : 1}
          onValueChange={(rowSpan) => onUpdate({ ...widget, rowSpan })}
        />
      </WorkbenchPropertyGrid>
    </WorkbenchPropertySection>
  );
}

export function PlaygroundStackPlacementSection({
  readOnly,
  widget,
  onUpdate,
}: {
  readOnly: boolean;
  widget: GenericWidget;
  onUpdate: WidgetUpdate;
}) {
  return (
    <WorkbenchPropertySection title="Stack Position">
      <WorkbenchPropertyGrid columns={2}>
        <WorkbenchPropertyNumberRow
          disabled={readOnly}
          label="Left"
          min={0}
          value={typeof widget.left === 'number' ? widget.left : undefined}
          onValueChange={(left) => onUpdate({ ...widget, left })}
        />
        <WorkbenchPropertyNumberRow
          disabled={readOnly}
          label="Top"
          min={0}
          value={typeof widget.top === 'number' ? widget.top : undefined}
          onValueChange={(top) => onUpdate({ ...widget, top })}
        />
        <WorkbenchPropertyNumberRow
          disabled={readOnly}
          label="Right"
          min={0}
          value={typeof widget.right === 'number' ? widget.right : undefined}
          onValueChange={(right) => onUpdate({ ...widget, right })}
        />
        <WorkbenchPropertyNumberRow
          disabled={readOnly}
          label="Bottom"
          min={0}
          value={typeof widget.bottom === 'number' ? widget.bottom : undefined}
          onValueChange={(bottom) => onUpdate({ ...widget, bottom })}
        />
      </WorkbenchPropertyGrid>
    </WorkbenchPropertySection>
  );
}

export function PlaygroundLinearPlacementSection({
  readOnly,
  widget,
  onUpdate,
}: {
  readOnly: boolean;
  widget: GenericWidget;
  onUpdate: WidgetUpdate;
}) {
  return (
    <WorkbenchPropertySection title="Flex Item">
      <WorkbenchPropertyNumberRow
        disabled={readOnly}
        label="Flex"
        min={0}
        step={0.1}
        value={typeof widget.flex === 'number' ? widget.flex : 1}
        onValueChange={(flex) => onUpdate({ ...widget, flex })}
      />
      <WorkbenchPropertySelectRow
        disabled={readOnly}
        label="Align"
        options={LINEAR_ALIGN_OPTIONS.map((option) => ({
          label: option.label,
          value: option.value,
        }))}
        value={
          widget.align === 'stretch' ||
          widget.align === 'start' ||
          widget.align === 'center' ||
          widget.align === 'end'
            ? widget.align
            : 'stretch'
        }
        onValueChange={(align) => onUpdate({ ...widget, align })}
      />
    </WorkbenchPropertySection>
  );
}

export function PlaygroundPlacementSections({
  parentWidget,
  readOnly,
  widget,
  onUpdate,
}: {
  parentWidget: GenericWidget | null;
  readOnly: boolean;
  widget: GenericWidget;
  onUpdate: WidgetUpdate;
}) {
  if (!parentWidget) return null;

  if (parentWidget.type === 'grid') {
    return (
      <PlaygroundGridPlacementSection readOnly={readOnly} widget={widget} onUpdate={onUpdate} />
    );
  }

  if (parentWidget.type === 'stack') {
    return (
      <PlaygroundStackPlacementSection readOnly={readOnly} widget={widget} onUpdate={onUpdate} />
    );
  }

  if (parentWidget.type === 'row' || parentWidget.type === 'column') {
    return (
      <PlaygroundLinearPlacementSection readOnly={readOnly} widget={widget} onUpdate={onUpdate} />
    );
  }

  return null;
}
