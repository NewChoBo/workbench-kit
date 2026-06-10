import type { GenericWidget } from './widget-tree.js';

export interface JsonWidgetNode {
  readonly type: string;
  readonly id?: string | undefined;
  readonly listen?: readonly string[] | undefined;
  readonly args: Record<string, unknown>;
}

export interface ParsedJsonWidgetData {
  readonly value: JsonWidgetNode | null;
  readonly parseError: string | null;
}

const CONTAINER_CHILDREN_ARG = 'children';
const SINGLE_CHILD_ARG = 'child';

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function formatParseError(error: unknown): string {
  if (error instanceof SyntaxError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function readJsonWidgetNode(value: unknown, errors: string[], path: string): JsonWidgetNode | null {
  if (!isObjectRecord(value)) {
    errors.push(`${path} must be a JSON object.`);
    return null;
  }

  const type = value.type;
  if (typeof type !== 'string' || type.trim().length === 0) {
    errors.push(`${path}.type must be a non-empty string.`);
    return null;
  }

  if (!('args' in value)) {
    errors.push(`${path} must use JDW v7 envelope (type + args).`);
    return null;
  }

  const args = value.args;
  if (!isObjectRecord(args)) {
    errors.push(`${path}.args must be an object.`);
    return null;
  }

  const listen = value.listen;
  if (listen !== undefined && (!Array.isArray(listen) || listen.some((item) => typeof item !== 'string'))) {
    errors.push(`${path}.listen must be an array of strings.`);
    return null;
  }

  return {
    type: type.trim(),
    ...(typeof value.id === 'string' && value.id.trim().length > 0 ? { id: value.id.trim() } : {}),
    ...(listen ? { listen: [...listen] } : {}),
    args: sanitizeArgs(args),
  };
}

function sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(args)) {
    if (value === null) {
      continue;
    }
    next[key] = value;
  }

  return next;
}

export function parseJsonWidgetData(source: string): ParsedJsonWidgetData {
  const normalized = source.trim();
  if (normalized.length === 0) {
    return { value: null, parseError: 'JSON is empty.' };
  }

  try {
    const parsed = JSON.parse(normalized) as unknown;
    if (!isObjectRecord(parsed)) {
      return { value: null, parseError: 'Root must be a JSON object.' };
    }

    const errors: string[] = [];
    const value = readJsonWidgetNode(parsed, errors, 'root');
    if (value) {
      validateNestedJsonWidgetNodes(value, errors, 'root');
    }
    if (errors.length > 0 || !value) {
      return { value: null, parseError: errors.join(' ') };
    }

    return { value, parseError: null };
  } catch (error) {
    return { value: null, parseError: formatParseError(error) };
  }
}

export function jdwNodeToGenericWidget(node: JsonWidgetNode): GenericWidget {
  if (node.type === 'expanded' || node.type === 'flexible') {
    const child = node.args[SINGLE_CHILD_ARG];
    if (!isObjectRecord(child) && !isJdwLikeNode(child)) {
      return { type: node.type, ...node.args };
    }

    const unwrapped = jdwNodeToGenericWidget(readChildNode(child));
    const flex = node.args.flex;
    return {
      ...unwrapped,
      ...(typeof flex === 'number' ? { flex } : {}),
    };
  }

  const widget: GenericWidget = { type: node.type };

  for (const [key, value] of Object.entries(node.args)) {
    if (key === CONTAINER_CHILDREN_ARG && Array.isArray(value)) {
      widget.children = value
        .map((child) => (isChildNodeValue(child) ? jdwNodeToGenericWidget(readChildNode(child)) : null))
        .filter((child): child is GenericWidget => child !== null);
      continue;
    }

    if (key === SINGLE_CHILD_ARG && isChildNodeValue(value)) {
      widget.child = jdwNodeToGenericWidget(readChildNode(value));
      continue;
    }

    widget[key] = value;
  }

  return widget;
}

export function genericWidgetToJdwNode(widget: GenericWidget): JsonWidgetNode {
  const args: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(widget)) {
    if (key === 'type' || value === undefined) {
      continue;
    }

    if (key === CONTAINER_CHILDREN_ARG && Array.isArray(value)) {
      args[key] = value
        .filter(isObjectRecord)
        .map((child) => genericWidgetToJdwNode(child as GenericWidget));
      continue;
    }

    if (key === SINGLE_CHILD_ARG && isObjectRecord(value)) {
      args[key] = genericWidgetToJdwNode(value as GenericWidget);
      continue;
    }

    if (key === 'flex' && typeof value === 'number') {
      continue;
    }

    args[key] = value;
  }

  if (typeof widget.flex === 'number') {
    const childRecord: GenericWidget = { type: widget.type };
    for (const [key, value] of Object.entries(widget)) {
      if (key === 'type' || key === 'flex' || key === 'children' || key === 'child' || value === undefined) {
        continue;
      }
      childRecord[key] = value;
    }

    if (Array.isArray(widget.children)) {
      childRecord.children = widget.children;
    }
    if (widget.child !== undefined) {
      childRecord.child = widget.child;
    }

    return {
      type: 'expanded',
      args: {
        flex: widget.flex,
        child: genericWidgetToJdwNode(childRecord),
      },
    };
  }

  return { type: widget.type, args };
}

export function formatJsonWidgetData(node: JsonWidgetNode): string {
  return `${JSON.stringify(node, null, 2)}\n`;
}

function isJdwLikeNode(value: unknown): value is JsonWidgetNode {
  return isObjectRecord(value) && typeof value.type === 'string' && isObjectRecord(value.args);
}

function isChildNodeValue(value: unknown): boolean {
  return isObjectRecord(value) || isJdwLikeNode(value);
}

function validateNestedJsonWidgetNodes(
  node: JsonWidgetNode,
  errors: string[],
  path: string,
): void {
  for (const [key, value] of Object.entries(node.args)) {
    if (key === CONTAINER_CHILDREN_ARG && Array.isArray(value)) {
      value.forEach((child, index) => {
        const childNode = readJsonWidgetNode(child, errors, `${path}.args.children[${index}]`);
        if (childNode) {
          validateNestedJsonWidgetNodes(childNode, errors, `${path}.args.children[${index}]`);
        }
      });
      continue;
    }

    if (key === SINGLE_CHILD_ARG) {
      const childNode = readJsonWidgetNode(value, errors, `${path}.args.child`);
      if (childNode) {
        validateNestedJsonWidgetNodes(childNode, errors, `${path}.args.child`);
      }
    }
  }
}

function readChildNode(value: unknown): JsonWidgetNode {
  if (isJdwLikeNode(value)) {
    return value;
  }

  if (
    isObjectRecord(value) &&
    typeof value.type === 'string' &&
    isObjectRecord(value.args)
  ) {
    return {
      type: value.type,
      args: value.args,
      ...(typeof value.id === 'string' && value.id.trim().length > 0 ? { id: value.id.trim() } : {}),
    };
  }

  return { type: 'unknown', args: {} };
}
