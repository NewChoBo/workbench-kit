export function toLengthValue(value: number | string) {
  return typeof value === 'number' ? `${value}px` : value;
}

export function toAngleValue(value: number | string) {
  return typeof value === 'number' ? `${value}deg` : value;
}

export function toLineLengthValue(start: number | string, end: number | string) {
  if (typeof start === 'number' && typeof end === 'number') {
    return `${Math.max(1, end - start)}px`;
  }
  return `max(1px, calc(${toLengthValue(end)} - ${toLengthValue(start)}))`;
}

export const DEFAULT_WORKBENCH_TREE_BASE_INDENT = 8;
export const DEFAULT_WORKBENCH_TREE_INDENT_SIZE = 14;

export function workbenchTreeIndentOffset(
  depth: number,
  indentSize: number = DEFAULT_WORKBENCH_TREE_INDENT_SIZE,
  baseIndent: number = DEFAULT_WORKBENCH_TREE_BASE_INDENT,
) {
  return `${baseIndent + Math.max(0, depth) * indentSize}px`;
}
