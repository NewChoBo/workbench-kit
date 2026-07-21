import {
  appendBoxChildPath,
  appendChildrenPath,
  type GenericWidget,
  type WidgetPath,
} from '@workbench-kit/jdw';

const ARRAY_CHILD_CONTAINER_TYPES = new Set(['row', 'column', 'grid', 'stack', 'list-view']);
const SINGLE_CHILD_CONTAINER_TYPES = new Set([
  'box',
  'container',
  'padding',
  'align',
  'center',
  'sized_box',
]);

export function canAddChildren(widget: GenericWidget | null): widget is GenericWidget {
  if (widget === null) {
    return false;
  }

  if (SINGLE_CHILD_CONTAINER_TYPES.has(widget.type)) {
    return widget.child === undefined;
  }

  return ARRAY_CHILD_CONTAINER_TYPES.has(widget.type) || Array.isArray(widget.children);
}

export function insertedWidgetPathForParent(
  parent: GenericWidget,
  parentPath: WidgetPath,
  index: number,
): WidgetPath {
  if (SINGLE_CHILD_CONTAINER_TYPES.has(parent.type) && parent.child === undefined) {
    return appendBoxChildPath(parentPath);
  }

  return appendChildrenPath(parentPath, index);
}

export function formatWidgetPlacementMeta(
  widget: GenericWidget,
  parentType?: string,
): string | null {
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
    const flexFit =
      widget.flexFit === 'tight' || widget.flexFit === 'loose' ? widget.flexFit : null;
    const align = typeof widget.align === 'string' ? widget.align : null;
    return [flex, flexFit, align].filter(Boolean).join(' · ') || null;
  }

  if (parentType === 'stack') {
    const left = typeof widget.left === 'number' ? `l${widget.left}` : null;
    const top = typeof widget.top === 'number' ? `t${widget.top}` : null;
    const right = typeof widget.right === 'number' ? `r${widget.right}` : null;
    const bottom = typeof widget.bottom === 'number' ? `b${widget.bottom}` : null;
    return [left, top, right, bottom].filter(Boolean).join(' · ') || null;
  }

  return null;
}
