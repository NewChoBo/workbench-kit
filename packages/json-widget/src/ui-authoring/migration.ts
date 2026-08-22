import type { UiComponentRef } from '@workbench-kit/contracts';

import { createWidgetDocument, formatWidgetDocumentJson } from '../document/document.js';
import { isObjectRecord } from '../is-object-record.js';
import { parseJsonWidgetData } from '../jdw/node.js';
import { collectWidgetNodes, replaceWidgetAtPath, type GenericWidget } from '../widget/tree.js';
import { createUiDocument, validateUiDocumentWrapperIdentity } from './document.js';
import {
  UI_DOCUMENT_AUTHORING_ARG,
  type MigrateWidgetDocumentOptions,
  type MigrateWidgetDocumentResult,
  type UiDocumentIssue,
} from './types.js';
import { cloneUiAuthoringJsonValue, deepFreezeUiAuthoringValue } from './immutability.js';

function isCanonicalText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function readExactComponent(value: unknown): UiComponentRef | null {
  if (!isObjectRecord(value) || !isCanonicalText(value.id) || !isCanonicalText(value.version)) {
    return null;
  }
  return { id: value.id, version: value.version };
}

export function migrateWidgetDocumentToUiDocument(
  source: string,
  options: MigrateWidgetDocumentOptions,
): MigrateWidgetDocumentResult {
  const parsed = parseJsonWidgetData(source);
  if (parsed.value === null) {
    return {
      document: null,
      source: null,
      issues: Object.freeze([
        {
          code: 'invalid-source',
          message: parsed.parseError ?? 'UI document source could not be parsed.',
          path: 'source',
        },
      ]),
    };
  }

  const raw = JSON.parse(source) as typeof parsed.value;
  const wrapperIssues = validateUiDocumentWrapperIdentity(raw);
  if (wrapperIssues.length > 0) {
    return { document: null, source: null, issues: wrapperIssues };
  }

  const widgetDocument = createWidgetDocument(source);
  if (widgetDocument.root === null) {
    return {
      document: null,
      source: null,
      issues: Object.freeze([
        {
          code: 'invalid-source',
          message: widgetDocument.parseError ?? 'UI document source could not be projected.',
          path: 'source',
        },
      ]),
    };
  }

  const issues: UiDocumentIssue[] = [];
  let root: GenericWidget = widgetDocument.root;
  for (const entry of collectWidgetNodes(widgetDocument.root)) {
    const existingNodeId = isCanonicalText(entry.widget.id) ? entry.widget.id : null;
    const existingEnvelope = isObjectRecord(entry.widget[UI_DOCUMENT_AUTHORING_ARG])
      ? entry.widget[UI_DOCUMENT_AUTHORING_ARG]
      : null;
    const existingComponent = readExactComponent(existingEnvelope?.component);
    let nodeId = existingNodeId;
    let component = existingComponent;

    if (nodeId === null || component === null) {
      let resolved: ReturnType<MigrateWidgetDocumentOptions['resolveIdentity']>;
      try {
        const context = deepFreezeUiAuthoringValue({
          widget: cloneUiAuthoringJsonValue(entry.widget),
          path: cloneUiAuthoringJsonValue(entry.path),
          parentPath:
            entry.parentPath === null ? null : cloneUiAuthoringJsonValue(entry.parentPath),
          existingNodeId,
          existingComponent:
            existingComponent === null ? null : cloneUiAuthoringJsonValue(existingComponent),
        });
        resolved = options.resolveIdentity(context);
      } catch (error) {
        resolved = {
          error: error instanceof Error ? error.message : String(error),
        };
      }
      if ('error' in resolved) {
        issues.push({
          code: 'migration-resolution-failed',
          message: resolved.error.trim() || 'UI document identity migration failed.',
          path: entry.path.length === 0 ? '$' : 'node',
          ...(existingNodeId !== null ? { nodeId: existingNodeId } : {}),
        });
        continue;
      }
      nodeId ??= resolved.nodeId;
      component ??= resolved.component;
    }

    if (!isCanonicalText(nodeId)) {
      issues.push({
        code: 'missing-node-id',
        message: 'The migration resolver returned an invalid stable node id.',
        path: `${entry.path.length === 0 ? '$' : 'node'}.id`,
      });
      continue;
    }
    const exactComponent = readExactComponent(component);
    if (exactComponent === null) {
      issues.push({
        code: 'invalid-component-ref',
        message: 'The migration resolver returned an invalid exact component reference.',
        path: `${entry.path.length === 0 ? '$' : 'node'}.$authoring.component`,
        nodeId,
      });
      continue;
    }

    const nextEnvelope = {
      ...(existingEnvelope ?? {}),
      component: exactComponent,
      properties: isObjectRecord(existingEnvelope?.properties) ? existingEnvelope.properties : {},
    };
    const replaced = replaceWidgetAtPath(root, entry.path, {
      ...entry.widget,
      id: nodeId,
      [UI_DOCUMENT_AUTHORING_ARG]: nextEnvelope,
    });
    root = replaced.root;
  }

  if (issues.length > 0) {
    return { document: null, source: null, issues: Object.freeze(issues) };
  }

  const migratedSource = formatWidgetDocumentJson(root);
  const created = createUiDocument(options.documentId, migratedSource);
  if (created.document === null) {
    return { document: null, source: null, issues: created.issues };
  }
  return {
    document: created.document,
    source: migratedSource,
    issues: Object.freeze([]),
  };
}
