import { isContainerWidget, type GenericWidget } from '@workbench-kit/json-widget';

export function canAddChildren(widget: GenericWidget | null): widget is GenericWidget {
  return widget !== null && isContainerWidget(widget) && widget.type !== 'box';
}

export function formatWidgetPlacementMeta(widget: GenericWidget, parentType?: string): string | null {
  if (parentType === 'grid') {
    const col = typeof widget.col === 'number' ? widget.col : null;
    const row = typeof widget.row === 'number' ? widget.row : null;
    if (col === null && row === null) return null;

    const span =
      typeof widget.colSpan === 'number' || typeof widget.rowSpan === 'number'
        ? ` span ${widget.colSpan ?? 1}x${widget.rowSpan ?? 1}`
        : '';

    return `c${col ?? '?'} r${row ?? '?'}${span}`;
  }

  if (parentType === 'row' || parentType === 'column') {
    const flex = typeof widget.flex === 'number' ? `flex ${widget.flex}` : null;
    const align = typeof widget.align === 'string' ? widget.align : null;
    return [flex, align].filter(Boolean).join(' · ') || null;
  }

  return null;
}
