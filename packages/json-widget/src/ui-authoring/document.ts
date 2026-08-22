import {
  isStructurallyValidUiValueSource,
  type UiComponentRef,
  type UiValueSource,
} from '@workbench-kit/contracts';

import { widgetPathKey, type WidgetPath } from '../document/path.js';
import {
  formatWidgetDocumentJson,
  createWidgetDocument,
  type WidgetDocument,
} from '../document/document.js';
import { isObjectRecord } from '../is-object-record.js';
import { parseJsonWidgetData, type JsonWidgetNode } from '../jdw/node.js';
import { collectWidgetNodes, type GenericWidget } from '../widget/tree.js';
import {
  UI_DOCUMENT_AUTHORING_ARG,
  type CreateUiDocumentResult,
  type UiDocument,
  type UiDocumentHierarchyEntry,
  type UiDocumentIssue,
  type UiDocumentNode,
  type UiDocumentNodeAuthoring,
} from './types.js';
import { deepFreezeUiAuthoringValue } from './immutability.js';

function isCanonicalText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function componentRef(value: unknown): UiComponentRef | null {
  if (!isObjectRecord(value) || !isCanonicalText(value.id) || !isCanonicalText(value.version)) {
    return null;
  }
  return { id: value.id, version: value.version };
}

export { isStructurallyValidUiValueSource };

function validateValueMap(
  value: unknown,
  basePath: string,
  nodeId: string | undefined,
  code: 'invalid-property-value' | 'invalid-layout-value',
): UiDocumentIssue[] {
  if (!isObjectRecord(value)) {
    return [
      {
        code,
        message:
          'UI authoring values must be an object of structurally valid UiValueSource values.',
        path: basePath,
        ...(nodeId !== undefined ? { nodeId } : {}),
      },
    ];
  }

  const issues: UiDocumentIssue[] = [];
  for (const [propertyId, source] of Object.entries(value)) {
    if (!isCanonicalText(propertyId) || !isStructurallyValidUiValueSource(source)) {
      issues.push({
        code,
        message: 'UI authoring property ids and values must be canonical and structurally valid.',
        path: `${basePath}.${propertyId}`,
        ...(nodeId !== undefined ? { nodeId } : {}),
        propertyId,
      });
    }
  }
  return issues;
}

export function readUiDocumentNodeAuthoring(widget: GenericWidget): UiDocumentNodeAuthoring | null {
  const value = widget[UI_DOCUMENT_AUTHORING_ARG];
  if (!isObjectRecord(value)) return null;

  const component = componentRef(value.component);
  if (!component || !isObjectRecord(value.properties)) return null;

  const properties = value.properties as Readonly<Record<string, UiValueSource>>;
  if (value.layout === undefined) {
    return { component, properties };
  }
  if (
    !isObjectRecord(value.layout) ||
    !isCanonicalText(value.layout.strategyId) ||
    !isObjectRecord(value.layout.values)
  ) {
    return null;
  }

  return {
    component,
    properties,
    layout: {
      strategyId: value.layout.strategyId,
      values: value.layout.values as Readonly<Record<string, UiValueSource>>,
    },
  };
}

export function validateUiDocumentWrapperIdentity(
  node: JsonWidgetNode,
  path = 'root',
): readonly UiDocumentIssue[] {
  const issues: UiDocumentIssue[] = [];
  const hasOwnId = Object.prototype.hasOwnProperty.call(node, 'id');
  if (hasOwnId && typeof node.id === 'string' && !isCanonicalText(node.id)) {
    issues.push({
      code: 'noncanonical-node-id',
      message: 'UI document node ids must be non-blank and already trimmed.',
      path: `${path}.id`,
      nodeId: node.id,
    });
  }
  if (
    (node.type === 'expanded' || node.type === 'flexible') &&
    (hasOwnId || Object.prototype.hasOwnProperty.call(node.args, UI_DOCUMENT_AUTHORING_ARG))
  ) {
    issues.push({
      code: 'wrapper-authoring-identity',
      message: 'Expanded/flexible serialization wrappers must not own authoring identity.',
      path,
      ...(typeof node.id === 'string' ? { nodeId: node.id } : {}),
    });
  }

  const children = node.args.children;
  if (Array.isArray(children)) {
    children.forEach((child, index) => {
      if (isObjectRecord(child) && typeof child.type === 'string' && isObjectRecord(child.args)) {
        issues.push(
          ...validateUiDocumentWrapperIdentity(
            child as unknown as JsonWidgetNode,
            `${path}.args.children[${index}]`,
          ),
        );
      }
    });
  }

  const child = node.args.child;
  if (isObjectRecord(child) && typeof child.type === 'string' && isObjectRecord(child.args)) {
    issues.push(
      ...validateUiDocumentWrapperIdentity(
        child as unknown as JsonWidgetNode,
        `${path}.args.child`,
      ),
    );
  }
  return issues;
}

export function validateUiDocumentRoot(root: GenericWidget): readonly UiDocumentIssue[] {
  const issues: UiDocumentIssue[] = [];
  const seen = new Set<string>();

  for (const entry of collectWidgetNodes(root)) {
    const path = widgetPathKey(entry.path);
    const nodeId = isCanonicalText(entry.widget.id) ? entry.widget.id : undefined;
    if (entry.widget.type === 'expanded' || entry.widget.type === 'flexible') {
      issues.push({
        code: 'wrapper-authoring-identity',
        message: 'Expanded/flexible serialization wrappers cannot be authoring nodes.',
        path,
        ...(nodeId !== undefined ? { nodeId } : {}),
      });
    }
    if (nodeId === undefined) {
      issues.push({
        code: 'missing-node-id',
        message: 'Every UI document node requires a non-blank, already-trimmed id.',
        path: `${path}.id`,
      });
    } else if (seen.has(nodeId)) {
      issues.push({
        code: 'duplicate-node-id',
        message: `UI document node id "${nodeId}" must be globally unique.`,
        path: `${path}.id`,
        nodeId,
      });
    } else {
      seen.add(nodeId);
    }

    const authoring = entry.widget[UI_DOCUMENT_AUTHORING_ARG];
    if (!isObjectRecord(authoring)) {
      issues.push({
        code: 'invalid-authoring-envelope',
        message: 'Every UI document node requires a $authoring envelope.',
        path: `${path}.${UI_DOCUMENT_AUTHORING_ARG}`,
        ...(nodeId !== undefined ? { nodeId } : {}),
      });
      continue;
    }

    if (componentRef(authoring.component) === null) {
      issues.push({
        code: 'invalid-component-ref',
        message: 'UI document component references require exact non-blank id and version.',
        path: `${path}.${UI_DOCUMENT_AUTHORING_ARG}.component`,
        ...(nodeId !== undefined ? { nodeId } : {}),
      });
    }
    issues.push(
      ...validateValueMap(
        authoring.properties,
        `${path}.${UI_DOCUMENT_AUTHORING_ARG}.properties`,
        nodeId,
        'invalid-property-value',
      ),
    );

    if (authoring.layout !== undefined) {
      if (!isObjectRecord(authoring.layout) || !isCanonicalText(authoring.layout.strategyId)) {
        issues.push({
          code: 'invalid-layout-strategy',
          message: 'UI document layout requires a non-blank, already-trimmed strategy id.',
          path: `${path}.${UI_DOCUMENT_AUTHORING_ARG}.layout.strategyId`,
          ...(nodeId !== undefined ? { nodeId } : {}),
        });
      }
      issues.push(
        ...validateValueMap(
          isObjectRecord(authoring.layout) ? authoring.layout.values : undefined,
          `${path}.${UI_DOCUMENT_AUTHORING_ARG}.layout.values`,
          nodeId,
          'invalid-layout-value',
        ),
      );
    }
  }

  return Object.freeze(issues);
}

export function createUiDocument(documentId: string, source: string): CreateUiDocumentResult {
  const issues: UiDocumentIssue[] = [];
  if (!isCanonicalText(documentId)) {
    issues.push({
      code: 'blank-document-id',
      message: 'UI document id must be non-blank and already trimmed.',
      path: 'documentId',
    });
  }

  const parsed = parseJsonWidgetData(source);
  if (parsed.parseError !== null || parsed.value === null) {
    issues.push({
      code: 'invalid-source',
      message: parsed.parseError ?? 'UI document source could not be parsed.',
      path: 'source',
    });
    return { document: null, issues: Object.freeze(issues) };
  }

  const raw = JSON.parse(source) as JsonWidgetNode;
  issues.push(...validateUiDocumentWrapperIdentity(raw));
  const widgetDocument: WidgetDocument = createWidgetDocument(source);
  if (widgetDocument.root === null) {
    issues.push({
      code: 'invalid-source',
      message: widgetDocument.parseError ?? 'UI document source could not be projected.',
      path: 'source',
    });
    return { document: null, issues: Object.freeze(issues) };
  }
  issues.push(...validateUiDocumentRoot(widgetDocument.root));
  if (issues.length > 0) {
    return { document: null, issues: Object.freeze(issues) };
  }

  return {
    document: deepFreezeUiAuthoringValue({
      documentId,
      revision: 0,
      source,
      root: widgetDocument.root as UiDocumentNode,
    }),
    issues: Object.freeze([]),
  };
}

export function createUiDocumentFromRoot(
  documentId: string,
  revision: number,
  root: GenericWidget,
): CreateUiDocumentResult {
  const rootIssues = validateUiDocumentRoot(root);
  if (rootIssues.length > 0) {
    return { document: null, issues: rootIssues };
  }

  let source: string;
  try {
    source = formatWidgetDocumentJson(root);
  } catch (error) {
    return {
      document: null,
      issues: Object.freeze([
        {
          code: 'invalid-source',
          message: error instanceof Error ? error.message : String(error),
          path: 'source',
        },
      ]),
    };
  }
  const result = createUiDocument(documentId, source);
  if (result.document === null) return result;
  return {
    document: deepFreezeUiAuthoringValue({ ...result.document, revision }),
    issues: result.issues,
  };
}

export function formatUiDocument(document: UiDocument): string {
  return document.source;
}

export function listUiDocumentHierarchy(document: UiDocument): readonly UiDocumentHierarchyEntry[] {
  return Object.freeze(
    collectWidgetNodes(document.root).map((entry) => ({
      nodeId: entry.widget.id as string,
      component: readUiDocumentNodeAuthoring(entry.widget)!.component,
      path: entry.path,
      parentNodeId: entry.parent ? (entry.parent.id as string) : null,
    })),
  );
}

export function findUiDocumentNodePath(document: UiDocument, nodeId: string): WidgetPath | null {
  return listUiDocumentHierarchy(document).find((entry) => entry.nodeId === nodeId)?.path ?? null;
}

export function projectUiDocumentSelectionPaths(
  document: UiDocument,
  selectedNodeIds: readonly string[],
): readonly WidgetPath[] {
  const paths = new Map(
    listUiDocumentHierarchy(document).map((entry) => [entry.nodeId, entry.path]),
  );
  return Object.freeze(
    selectedNodeIds.flatMap((nodeId) => {
      const path = paths.get(nodeId);
      return path ? [path] : [];
    }),
  );
}
