import type { WidgetTypeShape } from '@workbench-kit/contracts';

import type { GenericWidget } from './tree.js';

/** Package-internal finite-number guard (not a public export). */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Package-internal widget node guard (not a public export). */
export function isGenericWidget(value: unknown): value is GenericWidget {
  return (
    value !== null &&
    !Array.isArray(value) &&
    typeof value === 'object' &&
    typeof (value as WidgetTypeShape).type === 'string'
  );
}

/** Package-internal single-child container type check (not a public export). */
export function isSingleChildContainerType(type: string): boolean {
  return (
    type === 'box' ||
    type === 'container' ||
    type === 'padding' ||
    type === 'align' ||
    type === 'center' ||
    type === 'sized_box'
  );
}
