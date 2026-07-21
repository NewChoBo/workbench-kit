import type { WidgetPath } from './path.js';
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

export type JsonWidgetValueMap = Readonly<Record<string, unknown>>;

export interface JsonWidgetListenBinding {
  readonly widgetPath: WidgetPath;
  readonly nodePath: string;
  readonly type: string;
  readonly listen: readonly string[];
  readonly dependencies: readonly string[];
  readonly missingListen: readonly string[];
  readonly unusedListen: readonly string[];
}

export interface JsonWidgetInvalidation {
  readonly widgetPath: WidgetPath;
  readonly nodePath: string;
  readonly type: string;
  readonly listen: readonly string[];
  readonly changedListen: readonly string[];
  readonly changedPaths: readonly string[];
}

const CONTAINER_CHILDREN_ARG = 'children';
const SINGLE_CHILD_ARG = 'child';
const EXACT_VARIABLE_PATTERN = /^\$\{([A-Za-z0-9_.-]+)\}$/;
const TEMPLATE_VARIABLE_PATTERN = /\$\{([A-Za-z0-9_.-]+)\}/g;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isJsonWidgetDynamicValueExpression(value: unknown): value is string {
  return typeof value === 'string' && EXACT_VARIABLE_PATTERN.test(value);
}

function addStringValueDependencies(value: string, dependencies: Set<string>): void {
  for (const match of value.matchAll(TEMPLATE_VARIABLE_PATTERN)) {
    dependencies.add(match[1]);
  }
}

function collectValueDependencies(value: unknown, dependencies: Set<string>): void {
  if (typeof value === 'string') {
    addStringValueDependencies(value, dependencies);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectValueDependencies(item, dependencies));
    return;
  }

  if (isObjectRecord(value)) {
    Object.values(value).forEach((nestedValue) =>
      collectValueDependencies(nestedValue, dependencies),
    );
  }
}

function collectOwnArgsValueDependencies(args: Record<string, unknown>): readonly string[] {
  const dependencies = new Set<string>();

  for (const [key, value] of Object.entries(args)) {
    if (key === CONTAINER_CHILDREN_ARG || key === SINGLE_CHILD_ARG) {
      continue;
    }
    collectValueDependencies(value, dependencies);
  }

  return [...dependencies];
}

export function collectJsonWidgetValueDependencies(node: JsonWidgetNode): readonly string[] {
  const dependencies = new Set<string>();
  collectValueDependencies(node.args, dependencies);
  return [...dependencies];
}

export function collectJsonWidgetListenBindings(
  node: JsonWidgetNode,
  nodePath = 'root',
  widgetPath: WidgetPath = [],
): readonly JsonWidgetListenBinding[] {
  const listen = node.listen ?? [];
  const dependencies = collectOwnArgsValueDependencies(node.args);
  const bindings: JsonWidgetListenBinding[] = [
    {
      widgetPath,
      nodePath,
      type: node.type,
      listen,
      dependencies,
      missingListen: dependencies.filter((dependency) => !listen.includes(dependency)),
      unusedListen: listen.filter((dependency) => !dependencies.includes(dependency)),
    },
  ];

  const children = node.args[CONTAINER_CHILDREN_ARG];
  if (Array.isArray(children)) {
    children.forEach((child, index) => {
      if (isJdwLikeNode(child)) {
        bindings.push(
          ...collectJsonWidgetListenBindings(child, `${nodePath}.args.children[${index}]`, [
            ...widgetPath,
            { kind: 'children', index },
          ]),
        );
      }
    });
  }

  const child = node.args[SINGLE_CHILD_ARG];
  if (isJdwLikeNode(child)) {
    bindings.push(
      ...collectJsonWidgetListenBindings(child, `${nodePath}.args.child`, [
        ...widgetPath,
        { kind: 'child' },
      ]),
    );
  }

  return bindings;
}

function isValuePathRelated(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}.`) || right.startsWith(`${left}.`);
}

function changedListenForNode(
  listen: readonly string[],
  changedPaths: readonly string[],
): readonly string[] {
  return listen.filter((listenPath) =>
    changedPaths.some((changedPath) => isValuePathRelated(listenPath, changedPath)),
  );
}

export function collectJsonWidgetInvalidations(
  node: JsonWidgetNode,
  changedPaths: readonly string[],
): readonly JsonWidgetInvalidation[] {
  const uniqueChangedPaths = [
    ...new Set(changedPaths.map((path) => path.trim()).filter((path) => path.length > 0)),
  ];
  if (uniqueChangedPaths.length === 0) {
    return [];
  }

  return collectJsonWidgetListenBindings(node).flatMap((binding) => {
    const changedListen = changedListenForNode(binding.listen, uniqueChangedPaths);
    if (changedListen.length === 0) {
      return [];
    }

    return [
      {
        widgetPath: binding.widgetPath,
        nodePath: binding.nodePath,
        type: binding.type,
        listen: binding.listen,
        changedListen,
        changedPaths: uniqueChangedPaths,
      },
    ];
  });
}

function isTraversableValue(value: unknown): value is readonly unknown[] | Record<string, unknown> {
  return Array.isArray(value) || isObjectRecord(value);
}

function valueChildKeys(value: readonly unknown[] | Record<string, unknown>): readonly string[] {
  if (Array.isArray(value)) {
    return value.map((_, index) => String(index));
  }

  return Object.keys(value);
}

function readValueChild(value: readonly unknown[] | Record<string, unknown>, key: string): unknown {
  if (Array.isArray(value)) {
    return (value as readonly unknown[])[Number(key)];
  }

  return (value as Record<string, unknown>)[key];
}

function collectChangedValuePathsForValue(
  previousValue: unknown,
  nextValue: unknown,
  path: string,
  changedPaths: string[],
): void {
  if (Object.is(previousValue, nextValue)) {
    return;
  }

  if (!isTraversableValue(previousValue) || !isTraversableValue(nextValue)) {
    changedPaths.push(path);
    return;
  }

  const childKeys = new Set([...valueChildKeys(previousValue), ...valueChildKeys(nextValue)]);
  if (childKeys.size === 0) {
    changedPaths.push(path);
    return;
  }

  for (const key of childKeys) {
    collectChangedValuePathsForValue(
      readValueChild(previousValue, key),
      readValueChild(nextValue, key),
      `${path}.${key}`,
      changedPaths,
    );
  }
}

export function collectJsonWidgetChangedValuePaths(
  previousValues: JsonWidgetValueMap | undefined,
  nextValues: JsonWidgetValueMap | undefined,
): readonly string[] {
  if (Object.is(previousValues, nextValues)) {
    return [];
  }

  const previousRecord = previousValues ?? {};
  const nextRecord = nextValues ?? {};
  const changedPaths: string[] = [];
  const valueKeys = new Set([...Object.keys(previousRecord), ...Object.keys(nextRecord)]);

  for (const key of valueKeys) {
    collectChangedValuePathsForValue(previousRecord[key], nextRecord[key], key, changedPaths);
  }

  return [...new Set(changedPaths)];
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
  if (
    listen !== undefined &&
    (!Array.isArray(listen) || listen.some((item) => typeof item !== 'string'))
  ) {
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

function readValuePath(values: JsonWidgetValueMap, path: string): unknown {
  let current: unknown = values;

  for (const segment of path.split('.')) {
    if (!isObjectRecord(current) || !(segment in current)) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

function stringifyTemplateValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function resolveStringValue(value: string, values: JsonWidgetValueMap): unknown {
  const exactMatch = EXACT_VARIABLE_PATTERN.exec(value);
  if (exactMatch) {
    const resolved = readValuePath(values, exactMatch[1]);
    return resolved === undefined ? value : resolved;
  }

  return value.replace(TEMPLATE_VARIABLE_PATTERN, (match, path: string) => {
    const resolved = readValuePath(values, path);
    return resolved === undefined ? match : stringifyTemplateValue(resolved);
  });
}

function resolveValue(value: unknown, values: JsonWidgetValueMap): unknown {
  if (typeof value === 'string') {
    return resolveStringValue(value, values);
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, values));
  }

  if (isObjectRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, resolveValue(nestedValue, values)]),
    );
  }

  return value;
}

export function resolveJsonWidgetValues(
  node: JsonWidgetNode,
  values: JsonWidgetValueMap = {},
): JsonWidgetNode {
  return {
    ...node,
    args: resolveValue(node.args, values) as Record<string, unknown>,
  };
}

export function jdwNodeToGenericWidget(node: JsonWidgetNode): GenericWidget {
  if (node.type === 'expanded' || node.type === 'flexible') {
    const child = node.args[SINGLE_CHILD_ARG];
    if (!isObjectRecord(child) && !isJdwLikeNode(child)) {
      return { type: node.type, ...node.args };
    }

    const unwrapped = jdwNodeToGenericWidget(readChildNode(child));
    const flex = node.args.flex;
    const fit = node.type === 'expanded' ? 'tight' : node.args.fit === 'tight' ? 'tight' : 'loose';
    return {
      ...unwrapped,
      ...(typeof flex === 'number' ? { flex } : {}),
      flexFit: fit,
    };
  }

  const widget: GenericWidget = { type: node.type };

  for (const [key, value] of Object.entries(node.args)) {
    if (key === CONTAINER_CHILDREN_ARG && Array.isArray(value)) {
      widget.children = value
        .map((child) =>
          isChildNodeValue(child) ? jdwNodeToGenericWidget(readChildNode(child)) : null,
        )
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

    if ((key === 'flex' && typeof value === 'number') || key === 'flexFit') {
      continue;
    }

    args[key] = value;
  }

  if (typeof widget.flex === 'number') {
    const flexFit =
      widget.flexFit === 'loose' || widget.flexFit === 'tight' ? widget.flexFit : null;
    const childRecord: GenericWidget = { type: widget.type };
    for (const [key, value] of Object.entries(widget)) {
      if (
        key === 'type' ||
        key === 'flex' ||
        key === 'flexFit' ||
        key === 'children' ||
        key === 'child' ||
        value === undefined
      ) {
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
      type: flexFit === 'loose' ? 'flexible' : 'expanded',
      args: {
        flex: widget.flex,
        ...(flexFit === 'loose' ? { fit: 'loose' } : {}),
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

function validateNestedJsonWidgetNodes(node: JsonWidgetNode, errors: string[], path: string): void {
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

  if (isObjectRecord(value) && typeof value.type === 'string' && isObjectRecord(value.args)) {
    return {
      type: value.type,
      args: value.args,
      ...(typeof value.id === 'string' && value.id.trim().length > 0
        ? { id: value.id.trim() }
        : {}),
    };
  }

  return { type: 'unknown', args: {} };
}
