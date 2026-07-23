import {
  formatJsonWidgetData,
  parseJsonWidgetData,
  resolveJsonWidgetValues,
  type JsonWidgetNode,
  type JsonWidgetValueMap,
} from '../jdw/node.js';

export type JsonWidgetDocumentRefIssueCode =
  | 'empty-document-ref'
  | 'missing-document-ref'
  | 'parse-document-ref'
  | 'circular-document-ref'
  | 'max-depth-document-ref'
  | 'invalid-document';

export interface JsonWidgetDocumentRefIssue {
  readonly code: JsonWidgetDocumentRefIssueCode;
  readonly path: string;
  readonly message: string;
  /** Present for circular refs: normalized document path chain including the repeated target. */
  readonly cycle?: readonly string[] | undefined;
}

export interface ExpandJsonWidgetDocumentRefsOptions {
  /** Path of the document that owns `node` (workspace-style, `/` separators). */
  readonly documentPath?: string | null | undefined;
  /** Load another document by absolute workspace path. Return JSON text or null if missing. */
  readonly loadDocument: (path: string) => string | null;
  readonly maxDepth?: number | undefined;
}

export interface ExpandJsonWidgetDocumentRefsResult {
  readonly value: JsonWidgetNode | null;
  readonly issues: readonly JsonWidgetDocumentRefIssue[];
}

const DEFAULT_MAX_DEPTH = 8;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isJsonWidgetRefNode(node: JsonWidgetNode): boolean {
  return node.type === 'ref' && typeof node.args.path === 'string' && node.args.path.length > 0;
}

export function isCircularJsonWidgetDocumentRefIssue(issue: JsonWidgetDocumentRefIssue): boolean {
  return issue.code === 'circular-document-ref';
}

/** Normalize workspace document paths for stable cycle detection. */
export function normalizeJsonWidgetDocumentPath(path: string): string {
  const parts = path.replace(/\\/g, '/').trim().replace(/^\//, '').split('/');
  const resolved: string[] = [];

  for (const part of parts) {
    if (part === '' || part === '.') {
      continue;
    }
    if (part === '..') {
      resolved.pop();
      continue;
    }
    resolved.push(part);
  }

  return resolved.join('/');
}

export function joinJsonWidgetDocumentPath(
  fromDocumentPath: string | null | undefined,
  refPath: string,
): string {
  const normalizedRef = refPath.replace(/\\/g, '/').trim();
  if (normalizedRef.length === 0) {
    return '';
  }

  if (!normalizedRef.startsWith('.')) {
    return normalizeJsonWidgetDocumentPath(normalizedRef);
  }

  const normalizedFrom = fromDocumentPath ? normalizeJsonWidgetDocumentPath(fromDocumentPath) : '';
  const fromDir =
    normalizedFrom.length > 0 && normalizedFrom.includes('/')
      ? normalizedFrom.slice(0, normalizedFrom.lastIndexOf('/'))
      : '';
  const joined = fromDir.length > 0 ? `${fromDir}/${normalizedRef}` : normalizedRef;
  return normalizeJsonWidgetDocumentPath(joined);
}

function readRefInputs(args: Record<string, unknown>): JsonWidgetValueMap | undefined {
  if (!isObjectRecord(args.inputs)) {
    return undefined;
  }
  return args.inputs as JsonWidgetValueMap;
}

function stripDocumentSchema(node: JsonWidgetNode): JsonWidgetNode {
  if (!('$schema' in node.args)) {
    return node;
  }
  const { $schema: _schema, ...args } = node.args;
  return { ...node, args };
}

function pushCircularIssue(
  issues: JsonWidgetDocumentRefIssue[],
  documentPath: string | null,
  stack: readonly string[],
  targetPath: string,
): void {
  const cycle = [...stack, targetPath];
  issues.push({
    code: 'circular-document-ref',
    path: documentPath ?? '(root)',
    message: `Circular document ref is not allowed: ${cycle.join(' -> ')}`,
    cycle,
  });
}

function expandNode(
  node: JsonWidgetNode,
  options: ExpandJsonWidgetDocumentRefsOptions,
  documentPath: string | null,
  stack: readonly string[],
  issues: JsonWidgetDocumentRefIssue[],
  depth: number,
): JsonWidgetNode | null {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  if (depth > maxDepth) {
    issues.push({
      code: 'max-depth-document-ref',
      path: documentPath ?? '(root)',
      message: `Document ref expansion exceeded max depth (${maxDepth}).`,
    });
    return null;
  }

  if (isJsonWidgetRefNode(node)) {
    const refPath = String(node.args.path);
    const targetPath = joinJsonWidgetDocumentPath(documentPath, refPath);
    if (targetPath.length === 0) {
      issues.push({
        code: 'empty-document-ref',
        path: documentPath ?? '(root)',
        message: 'Document ref path is empty.',
      });
      return null;
    }

    // Self-ref and any cycle (A→B→A, A→A, …) are hard errors — never expand.
    if (stack.includes(targetPath)) {
      pushCircularIssue(issues, documentPath, stack, targetPath);
      return null;
    }

    const loaded = options.loadDocument(targetPath);
    if (loaded === null) {
      issues.push({
        code: 'missing-document-ref',
        path: documentPath ?? '(root)',
        message: `Document ref not found: ${targetPath}`,
      });
      return null;
    }

    const parsed = parseJsonWidgetData(loaded);
    if (parsed.parseError !== null || parsed.value === null) {
      issues.push({
        code: 'parse-document-ref',
        path: documentPath ?? '(root)',
        message: `Document ref parse failed for ${targetPath}: ${parsed.parseError ?? 'empty'}`,
      });
      return null;
    }

    let imported = stripDocumentSchema(parsed.value);
    const inputs = readRefInputs(node.args);
    if (inputs !== undefined) {
      imported = resolveJsonWidgetValues(imported, inputs);
    }

    return expandNode(imported, options, targetPath, [...stack, targetPath], issues, depth + 1);
  }

  const nextArgs: Record<string, unknown> = { ...node.args };

  if (Array.isArray(node.args.children)) {
    const children: JsonWidgetNode[] = [];
    for (const child of node.args.children) {
      if (!isObjectRecord(child) || typeof child.type !== 'string') {
        continue;
      }
      const childNode = child as unknown as JsonWidgetNode;
      const expanded = expandNode(childNode, options, documentPath, stack, issues, depth);
      if (expanded === null) {
        return null;
      }
      children.push(expanded);
    }
    nextArgs.children = children;
  }

  if (isObjectRecord(node.args.child) && typeof node.args.child.type === 'string') {
    const childNode = node.args.child as unknown as JsonWidgetNode;
    const expanded = expandNode(childNode, options, documentPath, stack, issues, depth);
    if (expanded === null) {
      return null;
    }
    nextArgs.child = expanded;
  }

  return {
    ...node,
    args: nextArgs,
  };
}

/**
 * Expand `type: "ref"` nodes by loading other JDW documents (import-style composition).
 * Call this before validate/layout/preview. `ref` is not a drawable known type.
 * Circular document refs are rejected and never expanded.
 */
export function expandJsonWidgetDocumentRefs(
  node: JsonWidgetNode,
  options: ExpandJsonWidgetDocumentRefsOptions,
): ExpandJsonWidgetDocumentRefsResult {
  const issues: JsonWidgetDocumentRefIssue[] = [];
  const documentPath = options.documentPath
    ? normalizeJsonWidgetDocumentPath(options.documentPath)
    : null;
  const value = expandNode(
    node,
    options,
    documentPath,
    documentPath ? [documentPath] : [],
    issues,
    0,
  );
  return { value, issues };
}

export function expandJsonWidgetDocumentRefsFromSource(
  source: string,
  options: ExpandJsonWidgetDocumentRefsOptions,
): ExpandJsonWidgetDocumentRefsResult & { readonly source: string | null } {
  const parsed = parseJsonWidgetData(source);
  if (parsed.parseError !== null || parsed.value === null) {
    return {
      value: null,
      source: null,
      issues: [
        {
          code: 'invalid-document',
          path: options.documentPath ?? '(root)',
          message: parsed.parseError ?? 'Document is empty.',
        },
      ],
    };
  }

  const expanded = expandJsonWidgetDocumentRefs(parsed.value, options);
  if (expanded.value === null) {
    return { ...expanded, source: null };
  }

  return {
    ...expanded,
    source: formatJsonWidgetData(expanded.value),
  };
}
