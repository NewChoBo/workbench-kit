import type { GenericWidget } from '@workbench-kit/json-widget';
import { getWidgetDisplayLabel, isContainerWidget } from '@workbench-kit/json-widget';

function isGenericWidget(value: unknown): value is GenericWidget {
  return (
    value !== null &&
    !Array.isArray(value) &&
    typeof value === 'object' &&
    typeof (value as GenericWidget).type === 'string'
  );
}

export function widgetDisplayName(widget: GenericWidget): string {
  if (typeof widget.label === 'string' && widget.label.trim().length > 0) {
    return widget.label;
  }
  if (typeof widget.id === 'string' && widget.id.trim().length > 0) {
    return widget.id;
  }
  if (widget.type === 'text' && typeof widget.text === 'string') {
    return widget.text;
  }
  return getWidgetDisplayLabel(widget);
}

export function getWidgetChildren(widget: GenericWidget): readonly GenericWidget[] {
  if (isGenericWidget(widget.child)) {
    return [widget.child];
  }

  const children = widget.children;
  if (!Array.isArray(children)) return [];
  return children.filter(isGenericWidget);
}

export { isContainerWidget };
