import { formatJsonWidgetData, type JsonWidgetNode } from '../jdw-node.js';
import type {
  JdwScreenSpec,
  ScreenExpandedNode,
  ScreenGridNode,
  ScreenNode,
  ScreenPanelNode,
  ScreenRowNode,
  ScreenStackNode,
  ScreenTextNode,
} from './types.js';

function textArgs(
  node: ScreenTextNode | ScreenPanelNode,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const style = node.style ?? {};
  const background =
    node.kind === 'panel' ? (node.background ?? style.background) : style.background;

  return {
    text: node.kind === 'panel' ? node.content : node.content,
    ...(style.color !== undefined ? { color: style.color } : {}),
    ...(style.fontSize !== undefined ? { fontSize: style.fontSize } : {}),
    ...(background !== undefined ? { background } : {}),
    ...placementArgs(node),
    ...extra,
  };
}

function placementArgs(node: ScreenNode): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  if ('col' in node && node.col !== undefined) args.col = node.col;
  if ('row' in node && node.row !== undefined) args.row = node.row;
  if ('colSpan' in node && node.colSpan !== undefined) args.colSpan = node.colSpan;
  if ('rowSpan' in node && node.rowSpan !== undefined) args.rowSpan = node.rowSpan;
  if ('top' in node && node.top !== undefined) args.top = node.top;
  if ('right' in node && node.right !== undefined) args.right = node.right;
  if ('left' in node && node.left !== undefined) args.left = node.left;
  if ('bottom' in node && node.bottom !== undefined) args.bottom = node.bottom;
  return args;
}

function containerArgs(
  node:
    | ScreenRowNode
    | ScreenGridNode
    | ScreenStackNode
    | { gap?: number; padding?: number; background?: string },
  children: readonly JsonWidgetNode[],
): Record<string, unknown> {
  return {
    ...(node.gap !== undefined ? { gap: node.gap } : {}),
    ...(node.padding !== undefined ? { padding: node.padding } : {}),
    ...(node.background !== undefined ? { background: node.background } : {}),
    children,
  };
}

function compileExpanded(node: ScreenExpandedNode): JsonWidgetNode {
  return {
    type: 'expanded',
    args: {
      ...(node.flex !== undefined ? { flex: node.flex } : {}),
      child: compileScreenNode(node.child),
    },
  };
}

export function compileScreenNode(node: ScreenNode): JsonWidgetNode {
  switch (node.kind) {
    case 'text':
      return { type: 'text', args: textArgs(node) };
    case 'panel':
      return { type: 'text', args: textArgs(node) };
    case 'expanded':
      return compileExpanded(node);
    case 'row':
    case 'column':
      return {
        type: node.kind,
        args: {
          ...containerArgs(
            node,
            node.children.map((child) => compileScreenNode(child)),
          ),
          ...placementArgs(node),
        },
      };
    case 'grid':
      return {
        type: 'grid',
        args: {
          columns: node.columns,
          ...containerArgs(
            node,
            node.children.map((child) => compileScreenNode(child)),
          ),
        },
      };
    case 'stack':
      return {
        type: 'stack',
        args: containerArgs(
          node,
          node.children.map((child) => compileScreenNode(child)),
        ),
      };
    default: {
      const exhaustive: never = node;
      return exhaustive;
    }
  }
}

export function compileScreenSpecToJdwNode(spec: JdwScreenSpec): JsonWidgetNode {
  return compileScreenNode(spec.root);
}

export function compileScreenSpecToJson(spec: JdwScreenSpec): string {
  return formatJsonWidgetData(compileScreenSpecToJdwNode(spec));
}
