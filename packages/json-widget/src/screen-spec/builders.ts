import type {
  ScreenColumnNode,
  ScreenExpandedNode,
  ScreenGridNode,
  ScreenNode,
  ScreenPanelNode,
  ScreenRowNode,
  ScreenStackNode,
  ScreenTextNode,
  ScreenTextStyle,
} from './types.js';

export function screenText(content: string, style: ScreenTextStyle = {}): ScreenTextNode {
  return { kind: 'text', content, style };
}

export function screenPanel(content: string, background = '#2b2f36'): ScreenPanelNode {
  return { kind: 'panel', content, background, style: { color: '#e8eaed' } };
}

export function screenExpanded(child: ScreenNode, flex = 1): ScreenExpandedNode {
  return { kind: 'expanded', flex, child };
}

export function screenRow(
  children: readonly ScreenNode[],
  options: Omit<ScreenRowNode, 'kind' | 'children'> = {},
): ScreenRowNode {
  return { kind: 'row', children, ...options };
}

export function screenColumn(
  children: readonly ScreenNode[],
  options: Omit<ScreenColumnNode, 'kind' | 'children'> = {},
): ScreenColumnNode {
  return { kind: 'column', children, ...options };
}

export function screenGrid(
  columns: number,
  children: readonly ScreenNode[],
  options: Omit<ScreenGridNode, 'kind' | 'columns' | 'children'> = {},
): ScreenGridNode {
  return { kind: 'grid', columns, children, ...options };
}

export function screenStack(
  children: readonly ScreenNode[],
  options: Omit<ScreenStackNode, 'kind' | 'children'> = {},
): ScreenStackNode {
  return { kind: 'stack', children, ...options };
}
