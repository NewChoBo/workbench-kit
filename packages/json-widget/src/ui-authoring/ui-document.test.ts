import { describe, expect, it, vi } from 'vitest';

import { createWidgetDocument, formatWidgetDocumentJson } from '../document/document.js';
import { parseJsonWidgetData } from '../jdw/node.js';
import type { GenericWidget } from '../widget/tree.js';
import { applyUiDocumentCommand } from './commands.js';
import {
  createUiDocument,
  listUiDocumentHierarchy,
  projectUiDocumentSelectionPaths,
} from './document.js';
import { migrateWidgetDocumentToUiDocument } from './migration.js';
import {
  applyUiAuthoringSessionCommand,
  createUiAuthoringSession,
  redoUiAuthoringSession,
  selectUiDocumentNodes,
  undoUiAuthoringSession,
} from './session.js';
import type { UiDocument, UiDocumentNode } from './types.js';

function authored(
  id: string,
  type: string,
  fields: Readonly<Record<string, unknown>> = {},
): UiDocumentNode {
  return {
    type,
    id,
    $authoring: {
      component: { id: `test:${type}`, version: '1.0.0' },
      properties: {},
    },
    ...fields,
  } as UiDocumentNode;
}

function sourceFor(root: GenericWidget): string {
  return formatWidgetDocumentJson(root);
}

function createFixtureDocument(): UiDocument {
  const created = createUiDocument(
    'fixture',
    sourceFor(
      authored('root', 'column', {
        children: [
          authored('first', 'text', { text: 'First' }),
          authored('second', 'text', { text: 'Second' }),
        ],
      }),
    ),
  );
  expect(created.issues).toEqual([]);
  return created.document!;
}

describe('UiDocument identity and persistence', () => {
  it('round-trips ordinary top-level ids without leaking them into args', () => {
    const source = sourceFor(authored('root-node', 'text', { text: 'Hello' }));
    const parsed = parseJsonWidgetData(source).value!;

    expect(parsed.id).toBe('root-node');
    expect(parsed.args).not.toHaveProperty('id');
    expect(parsed.args.$authoring).toMatchObject({
      component: { id: 'test:text', version: '1.0.0' },
    });
    expect(createWidgetDocument(source).root).toMatchObject({ id: 'root-node' });
    expect(createUiDocument('doc', source).document?.root.id).toBe('root-node');
  });

  it('keeps expanded/flexible identity on the semantic child and rejects wrapper identity', () => {
    const source = sourceFor(authored('semantic-child', 'text', { text: 'Flex', flex: 1 }));
    const parsed = parseJsonWidgetData(source).value!;

    expect(parsed.type).toBe('expanded');
    expect(parsed.id).toBeUndefined();
    expect(parsed.args.$authoring).toBeUndefined();
    expect(parsed.args.child).toMatchObject({
      id: 'semantic-child',
      args: { $authoring: { component: { id: 'test:text', version: '1.0.0' } } },
    });
    expect(createUiDocument('doc', source).document?.root.id).toBe('semantic-child');

    const invalid = JSON.stringify({
      ...parsed,
      id: 'wrapper-id',
    });
    expect(createUiDocument('doc', invalid)).toMatchObject({
      document: null,
      issues: [{ code: 'wrapper-authoring-identity' }],
    });
  });

  it('fails closed on duplicate ids and malformed authoring values', () => {
    const created = createUiDocument(
      'doc',
      sourceFor(
        authored('root', 'column', {
          children: [
            authored('duplicate', 'text'),
            authored('duplicate', 'text', {
              $authoring: {
                component: { id: 'test:text', version: '' },
                properties: { color: { kind: 'token', tokenId: '' } },
              },
            }),
          ],
        }),
      ),
    );

    expect(created.document).toBeNull();
    expect(created.issues.map((issue) => issue.code)).toEqual([
      'duplicate-node-id',
      'invalid-component-ref',
      'invalid-property-value',
    ]);
  });

  it('projects stable-id hierarchy and selection to current paths', () => {
    const document = createFixtureDocument();
    expect(
      listUiDocumentHierarchy(document).map(({ nodeId, parentNodeId }) => ({
        nodeId,
        parentNodeId,
      })),
    ).toEqual([
      { nodeId: 'root', parentNodeId: null },
      { nodeId: 'first', parentNodeId: 'root' },
      { nodeId: 'second', parentNodeId: 'root' },
    ]);
    expect(projectUiDocumentSelectionPaths(document, ['second', 'missing'])).toEqual([
      [{ kind: 'children', index: 1 }],
    ]);
  });
});

describe('UiDocument migration', () => {
  it('migrates in root-first order, preserves valid identity, and is deterministic', () => {
    const source = sourceFor({
      type: 'column',
      children: [authored('preserved', 'text'), { type: 'text', text: 'legacy' }],
    });
    const resolver = vi.fn((context: { path: readonly unknown[]; widget: GenericWidget }) => ({
      nodeId: context.path.length === 0 ? 'root' : 'legacy-child',
      component: { id: `test:${context.widget.type}`, version: '1.0.0' },
    }));

    const first = migrateWidgetDocumentToUiDocument(source, {
      documentId: 'migrated',
      resolveIdentity: resolver,
    });
    const second = migrateWidgetDocumentToUiDocument(source, {
      documentId: 'migrated',
      resolveIdentity: resolver,
    });

    expect(first.issues).toEqual([]);
    expect(first.source).toBe(second.source);
    expect(first.document?.root.id).toBe('root');
    expect(listUiDocumentHierarchy(first.document!).map((entry) => entry.nodeId)).toEqual([
      'root',
      'preserved',
      'legacy-child',
    ]);
    expect(resolver).toHaveBeenCalledTimes(4);
    expect(resolver.mock.calls.map(([context]) => context.path.length)).toEqual([0, 1, 0, 1]);
  });

  it('returns no partial source when resolution fails or collides', () => {
    const source = sourceFor({
      type: 'column',
      children: [{ type: 'text' }, { type: 'text' }],
    });
    const unresolved = migrateWidgetDocumentToUiDocument(source, {
      documentId: 'migrated',
      resolveIdentity: () => ({ error: 'missing mapping' }),
    });
    expect(unresolved.source).toBeNull();
    expect(unresolved.document).toBeNull();
    expect(unresolved.issues.length).toBeGreaterThan(0);

    const collided = migrateWidgetDocumentToUiDocument(source, {
      documentId: 'migrated',
      resolveIdentity: ({ widget }) => ({
        nodeId: 'same-id',
        component: { id: `test:${widget.type}`, version: '1.0.0' },
      }),
    });
    expect(collided.source).toBeNull();
    expect(collided.issues.some((issue) => issue.code === 'duplicate-node-id')).toBe(true);
  });

  it('does not silently migrate wrapper-owned identity', () => {
    const invalid = JSON.stringify({
      type: 'expanded',
      id: 'wrapper',
      args: {
        flex: 1,
        child: { type: 'text', args: { text: 'child' } },
      },
    });
    const migrated = migrateWidgetDocumentToUiDocument(invalid, {
      documentId: 'migrated',
      resolveIdentity: () => ({
        nodeId: 'child',
        component: { id: 'test:text', version: '1.0.0' },
      }),
    });
    expect(migrated).toMatchObject({
      document: null,
      source: null,
      issues: [{ code: 'wrapper-authoring-identity' }],
    });
  });
});

describe('UiDocument commands and history', () => {
  it('applies all structural commands through WidgetPatch with one revision each', () => {
    let document = createFixtureDocument();
    const inserted = applyUiDocumentCommand(document, {
      type: 'insert-node',
      commandId: 'insert',
      parentId: 'root',
      index: 1,
      node: authored('inserted', 'text', { text: 'Inserted' }),
    });
    expect(inserted.changed).toBe(true);
    expect(inserted.transaction?.patches).toHaveLength(1);
    expect(inserted.document.revision).toBe(1);
    document = inserted.document;

    const moved = applyUiDocumentCommand(document, {
      type: 'move-node',
      commandId: 'move',
      nodeId: 'inserted',
      targetParentId: 'root',
      index: 3,
    });
    expect(listUiDocumentHierarchy(moved.document).map((entry) => entry.nodeId)).toEqual([
      'root',
      'first',
      'second',
      'inserted',
    ]);
    document = moved.document;

    const replaced = applyUiDocumentCommand(document, {
      type: 'replace-node',
      commandId: 'replace',
      nodeId: 'second',
      node: authored('second', 'text', { text: 'Replaced' }),
    });
    expect((replaced.document.root.children as readonly GenericWidget[])[1]).toMatchObject({
      text: 'Replaced',
    });
    document = replaced.document;

    const removed = applyUiDocumentCommand(document, {
      type: 'remove-node',
      commandId: 'remove',
      nodeId: 'first',
    });
    expect(listUiDocumentHierarchy(removed.document).map((entry) => entry.nodeId)).toEqual([
      'root',
      'second',
      'inserted',
    ]);
    expect(removed.document.revision).toBe(4);
  });

  it('makes Canvas and Inspector callers converge through the same property/layout command path', () => {
    const document = createFixtureDocument();
    const canvas = applyUiDocumentCommand(document, {
      type: 'set-property',
      commandId: 'canvas-color',
      nodeId: 'first',
      propertyId: 'color',
      value: { kind: 'token', tokenId: 'color.accent' },
    });
    const inspector = applyUiDocumentCommand(document, {
      type: 'set-property',
      commandId: 'inspector-color',
      nodeId: 'first',
      propertyId: 'color',
      value: { kind: 'token', tokenId: 'color.accent' },
    });
    expect(canvas.document.source).toBe(inspector.document.source);

    const layout = applyUiDocumentCommand(canvas.document, {
      type: 'set-layout',
      commandId: 'canvas-layout',
      nodeId: 'root',
      strategyId: 'flex',
      values: { gap: { kind: 'literal', value: 8 } },
    });
    expect(layout.changed).toBe(true);
    expect(layout.transaction?.patches).toHaveLength(1);
    expect(layout.document.root.$authoring.layout).toEqual({
      strategyId: 'flex',
      values: { gap: { kind: 'literal', value: 8 } },
    });
  });

  it('fails atomically for invalid commands and treats semantic repeats as noops', () => {
    const document = createFixtureDocument();
    const invalidInsert = applyUiDocumentCommand(document, {
      type: 'insert-node',
      commandId: 'duplicate',
      parentId: 'root',
      index: 0,
      node: authored('first', 'text'),
    });
    expect(invalidInsert.changed).toBe(false);
    expect(invalidInsert.document).toBe(document);
    expect(invalidInsert.issues.some((issue) => issue.code === 'duplicate-node-id')).toBe(true);

    const invalidValue = applyUiDocumentCommand(document, {
      type: 'set-property',
      commandId: 'invalid-value',
      nodeId: 'first',
      propertyId: 'color',
      value: { kind: 'token', tokenId: '' },
    });
    expect(invalidValue.document).toBe(document);
    expect(invalidValue.issues).toMatchObject([{ code: 'invalid-property-value' }]);

    expect(
      applyUiDocumentCommand(document, {
        type: 'remove-node',
        commandId: 'remove-root',
        nodeId: 'root',
      }).issues,
    ).toMatchObject([{ code: 'root-structural-command' }]);
    expect(
      applyUiDocumentCommand(document, {
        type: 'replace-node',
        commandId: 'replace-id',
        nodeId: 'first',
        node: authored('different', 'text'),
      }).issues,
    ).toMatchObject([{ code: 'replacement-id-mismatch' }]);

    const first = applyUiDocumentCommand(document, {
      type: 'set-property',
      commandId: 'set-text',
      nodeId: 'first',
      propertyId: 'text',
      value: { kind: 'literal', value: 'same' },
    });
    const repeated = applyUiDocumentCommand(first.document, {
      type: 'set-property',
      commandId: 'set-text-again',
      nodeId: 'first',
      propertyId: 'text',
      value: { kind: 'literal', value: 'same' },
    });
    expect(repeated.changed).toBe(false);
    expect(repeated.document.revision).toBe(1);
  });

  it('repairs selection and moves complete records through undo/redo', () => {
    const document = createFixtureDocument();
    let state = selectUiDocumentNodes(createUiAuthoringSession(document), [
      'second',
      'second',
      'missing',
    ]);
    expect(state.selectedNodeIds).toEqual(['second']);

    const applied = applyUiAuthoringSessionCommand(state, {
      type: 'remove-node',
      commandId: 'remove-selected',
      nodeId: 'second',
    });
    state = applied.state;
    expect(state.selectedNodeIds).toEqual([]);
    expect(state.past).toHaveLength(1);
    expect(state.past[0]).toMatchObject({
      beforeSelectedNodeIds: ['second'],
      afterSelectedNodeIds: [],
    });

    const undone = undoUiAuthoringSession(state)!;
    expect(undone.document.revision).toBe(0);
    expect(undone.selectedNodeIds).toEqual(['second']);
    expect(undone.future[0]).toBe(state.past[0]);

    const redone = redoUiAuthoringSession(undone)!;
    expect(redone.document.revision).toBe(1);
    expect(redone.selectedNodeIds).toEqual([]);
    expect(redone.past[0]).toBe(state.past[0]);

    const newAfterUndo = applyUiAuthoringSessionCommand(undone, {
      type: 'set-property',
      commandId: 'new-command',
      nodeId: 'first',
      propertyId: 'text',
      value: { kind: 'literal', value: 'new' },
    }).state;
    expect(newAfterUndo.future).toEqual([]);
  });
});
