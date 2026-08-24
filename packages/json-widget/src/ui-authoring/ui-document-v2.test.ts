import type {
  UiComponentCatalogContract,
  UiComponentDescriptor,
  UiComponentRef,
} from '@workbench-kit/contracts';
import { describe, expect, it } from 'vitest';

import { formatWidgetDocumentJson } from '../document/document.js';
import { applyWidgetPatch } from '../widget/patch.js';
import { collectWidgetNodes, type GenericWidget } from '../widget/tree.js';
import { applyUiDocumentCommandV2 } from './commands-v2.js';
import { applyUiDocumentCommand } from './commands.js';
import {
  createUiDocument,
  readUiDocumentNodeAuthoring,
  validateUiDocumentRoot,
} from './document.js';
import {
  applyUiAuthoringSessionCommandV2,
  createUiAuthoringSessionV2,
  redoUiAuthoringSessionV2,
  undoUiAuthoringSessionV2,
} from './session-v2.js';
import type {
  UiDocument,
  UiDocumentCommandV2,
  UiDocumentCommandV2Context,
  UiDocumentNode,
} from './types.js';

const TEXT_COMPONENT: UiComponentDescriptor = Object.freeze({
  id: 'test:text',
  version: '1.0.0',
  kind: 'atomic',
  bindings: Object.freeze([
    Object.freeze({ id: 'value', direction: 'input', value: { type: 'string' } }),
    Object.freeze({ id: 'changed', direction: 'output', value: { type: 'string' } }),
    Object.freeze({ id: 'two-way', direction: 'bidirectional', value: { type: 'string' } }),
  ]),
  designTime: Object.freeze({ label: 'Text' }),
});

const COLUMN_COMPONENT: UiComponentDescriptor = Object.freeze({
  id: 'test:column',
  version: '1.0.0',
  kind: 'atomic',
  bindings: Object.freeze([
    Object.freeze({ id: 'items', direction: 'input', value: { type: 'string' } }),
  ]),
  designTime: Object.freeze({ label: 'Column' }),
});

function componentCatalog(
  descriptors: readonly UiComponentDescriptor[] = [COLUMN_COMPONENT, TEXT_COMPONENT],
): UiComponentCatalogContract {
  const byRef = new Map(
    descriptors.map((descriptor) => [`${descriptor.id}@${descriptor.version}`, descriptor]),
  );
  return Object.freeze({
    component(ref: UiComponentRef) {
      return byRef.get(`${ref.id}@${ref.version}`);
    },
    components() {
      return descriptors;
    },
  });
}

function context(
  descriptors: readonly UiComponentDescriptor[] = [COLUMN_COMPONENT, TEXT_COMPONENT],
): UiDocumentCommandV2Context {
  return Object.freeze({ componentCatalog: componentCatalog(descriptors) });
}

function authored(
  id: string,
  type: 'column' | 'text',
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
  const firstBase = authored('first', 'text', { text: 'First' });
  const first = {
    ...firstBase,
    $authoring: {
      ...firstBase.$authoring,
      properties: {
        data: { kind: 'binding', bindingId: 'property:data' },
      },
    },
  } as UiDocumentNode;
  const created = createUiDocument(
    'v2-fixture',
    sourceFor(
      authored('root', 'column', {
        children: [first, authored('second', 'text', { text: 'Second' })],
      }),
    ),
  );
  expect(created.issues).toEqual([]);
  return created.document!;
}

function node(document: UiDocument, nodeId: string): UiDocumentNode {
  return collectWidgetNodes(document.root).find((entry) => entry.widget.id === nodeId)!
    .widget as UiDocumentNode;
}

function authoring(document: UiDocument, nodeId: string) {
  return readUiDocumentNodeAuthoring(node(document, nodeId))!;
}

function issueCodes(result: { readonly issues: readonly { readonly code: string }[] }) {
  return result.issues.map((issue) => issue.code);
}

describe('UiDocument hostile command and identity validation', () => {
  it.each([
    [
      'insert with missing $authoring',
      {
        type: 'insert-node',
        commandId: 'insert-missing-authoring',
        parentId: 'root',
        index: 0,
        node: { type: 'text', id: 'inserted-missing' },
      },
    ],
    [
      'insert with null $authoring',
      {
        type: 'insert-node',
        commandId: 'insert-null-authoring',
        parentId: 'root',
        index: 0,
        node: { type: 'text', id: 'inserted-null', $authoring: null },
      },
    ],
    [
      'replace with missing $authoring',
      {
        type: 'replace-node',
        commandId: 'replace-missing-authoring',
        nodeId: 'first',
        node: { type: 'text', id: 'first' },
      },
    ],
    [
      'replace with null $authoring',
      {
        type: 'replace-node',
        commandId: 'replace-null-authoring',
        nodeId: 'first',
        node: { type: 'text', id: 'first', $authoring: null },
      },
    ],
  ] as const)('rejects %s as an invalid authoring envelope without throwing', (_label, command) => {
    const document = createFixtureDocument();
    const apply = () =>
      applyUiDocumentCommand(
        document,
        command as unknown as Parameters<typeof applyUiDocumentCommand>[1],
      );
    expect(apply).not.toThrow();
    const result = apply();
    expect(result.document).toBe(document);
    expect(result.changed).toBe(false);
    expect(result.transaction).toBeNull();
    expect(issueCodes(result)).toContain('invalid-authoring-envelope');
  });

  it('rejects unknown V1 and V2 command discriminants without throwing', () => {
    const document = createFixtureDocument();
    const unknownV1 = {
      type: 'unknown-v1-command',
      commandId: 'unknown-v1',
    } as unknown as Parameters<typeof applyUiDocumentCommand>[1];
    const applyV1 = () => applyUiDocumentCommand(document, unknownV1);
    expect(applyV1).not.toThrow();
    expect(issueCodes(applyV1())).toContain('invalid-command-payload');

    const unknownV2 = {
      type: 'unknown-v2-command',
      commandId: 'unknown-v2',
    } as unknown as UiDocumentCommandV2;
    const applyV2 = () => applyUiDocumentCommandV2(document, unknownV2, context());
    expect(applyV2).not.toThrow();
    expect(issueCodes(applyV2())).toContain('invalid-command-payload');

    const unknownBatchChild = {
      type: 'batch',
      commandId: 'unknown-v2-batch',
      commands: [{ type: 'unknown-child', commandId: 'unknown-child' }],
    } as unknown as UiDocumentCommandV2;
    const applyBatch = () => applyUiDocumentCommandV2(document, unknownBatchChild, context());
    expect(applyBatch).not.toThrow();
    expect(issueCodes(applyBatch())).toContain('invalid-command-payload');
  });

  it('rejects inherited node ids and authoring envelopes as structural identity', () => {
    const inheritedId = Object.assign(
      Object.create({ id: 'inherited-id' }) as Record<string, unknown>,
      {
        type: 'text',
        $authoring: {
          component: { id: 'test:text', version: '1.0.0' },
          properties: {},
        },
      },
    ) as unknown as GenericWidget;
    expect(issueCodes({ issues: validateUiDocumentRoot(inheritedId) })).toContain(
      'missing-node-id',
    );

    const inheritedAuthoring = Object.assign(
      Object.create({
        $authoring: {
          component: { id: 'test:text', version: '1.0.0' },
          properties: {},
        },
      }) as Record<string, unknown>,
      { type: 'text', id: 'own-id' },
    ) as unknown as GenericWidget;
    expect(issueCodes({ issues: validateUiDocumentRoot(inheritedAuthoring) })).toContain(
      'invalid-authoring-envelope',
    );
  });
});

describe('UiDocument V2 endpoint bindings', () => {
  it('upgrades v0 on first binding and keeps endpoint and property binding namespaces separate', () => {
    const before = createFixtureDocument();
    expect(authoring(before, 'root').documentSchemaVersion).toBeUndefined();
    expect(authoring(before, 'first').properties).toEqual({
      data: { kind: 'binding', bindingId: 'property:data' },
    });

    const set = applyUiDocumentCommandV2(
      before,
      {
        type: 'set-input-binding',
        commandId: 'set-first-value',
        nodeId: 'first',
        inputId: 'value',
        bindingId: 'provider:value',
      },
      context(),
    );

    expect(set.changed).toBe(true);
    expect(set.issues).toEqual([]);
    expect(set.document.revision).toBe(1);
    expect(authoring(set.document, 'root').documentSchemaVersion).toBe(1);
    expect(authoring(set.document, 'first')).toMatchObject({
      bindings: { value: 'provider:value' },
      properties: { data: { kind: 'binding', bindingId: 'property:data' } },
    });

    const repeated = applyUiDocumentCommandV2(
      set.document,
      {
        type: 'set-input-binding',
        commandId: 'repeat-first-value',
        nodeId: 'first',
        inputId: 'value',
        bindingId: 'provider:value',
      },
      context(),
    );
    expect(repeated).toMatchObject({ changed: false, transaction: null, issues: [] });
    expect(repeated.document).toBe(set.document);

    const fanOut = applyUiDocumentCommandV2(
      set.document,
      {
        type: 'set-input-binding',
        commandId: 'fan-out-second-value',
        nodeId: 'second',
        inputId: 'value',
        bindingId: 'provider:value',
      },
      context(),
    );
    expect(authoring(fanOut.document, 'first').bindings).toEqual({ value: 'provider:value' });
    expect(authoring(fanOut.document, 'second').bindings).toEqual({ value: 'provider:value' });

    const cleared = applyUiDocumentCommandV2(
      fanOut.document,
      {
        type: 'clear-input-binding',
        commandId: 'clear-first-value',
        nodeId: 'first',
        inputId: 'value',
      },
      context(),
    );
    expect(cleared.changed).toBe(true);
    expect(authoring(cleared.document, 'first').bindings).toBeUndefined();
    expect(authoring(cleared.document, 'second').bindings).toEqual({ value: 'provider:value' });
    expect(authoring(cleared.document, 'root').documentSchemaVersion).toBe(1);

    const clearMissing = applyUiDocumentCommandV2(
      cleared.document,
      {
        type: 'clear-input-binding',
        commandId: 'clear-first-again',
        nodeId: 'first',
        inputId: 'value',
      },
      context(),
    );
    expect(clearMissing).toMatchObject({ changed: false, transaction: null, issues: [] });
    expect(clearMissing.document).toBe(cleared.document);
  });

  it('fails closed for missing nodes, inputs, output-only endpoints, exact-version misses, and invalid binding ids', () => {
    const document = createFixtureDocument();
    const commands = [
      {
        command: {
          type: 'set-input-binding',
          commandId: 'missing-node',
          nodeId: 'missing',
          inputId: 'value',
          bindingId: 'provider:value',
        } as const,
        expected: 'node-not-found',
        context: context(),
      },
      {
        command: {
          type: 'set-input-binding',
          commandId: 'missing-input',
          nodeId: 'first',
          inputId: 'missing',
          bindingId: 'provider:value',
        } as const,
        expected: 'input-unavailable',
        context: context(),
      },
      {
        command: {
          type: 'set-input-binding',
          commandId: 'output-only',
          nodeId: 'first',
          inputId: 'changed',
          bindingId: 'provider:value',
        } as const,
        expected: 'input-output-only',
        context: context(),
      },
      {
        command: {
          type: 'set-input-binding',
          commandId: 'component-version-miss',
          nodeId: 'first',
          inputId: 'value',
          bindingId: 'provider:value',
        } as const,
        expected: 'component-unavailable',
        context: context([COLUMN_COMPONENT, { ...TEXT_COMPONENT, version: '2.0.0' }]),
      },
      {
        command: {
          type: 'set-input-binding',
          commandId: 'blank-binding',
          nodeId: 'first',
          inputId: 'value',
          bindingId: ' ',
        } as const,
        expected: 'invalid-binding-id',
        context: context(),
      },
    ];

    for (const entry of commands) {
      const result = applyUiDocumentCommandV2(document, entry.command, entry.context);
      expect(issueCodes(result), entry.command.commandId).toContain(entry.expected);
      expect(result.document, entry.command.commandId).toBe(document);
      expect(result).toMatchObject({ changed: false, transaction: null });
    }
  });

  it('accepts bidirectional endpoints and rejects empty, nested, and duplicate-id batches', () => {
    const document = createFixtureDocument();
    const bidirectional = applyUiDocumentCommandV2(
      document,
      {
        type: 'set-input-binding',
        commandId: 'set-two-way',
        nodeId: 'first',
        inputId: 'two-way',
        bindingId: 'provider:two-way',
      },
      context(),
    );
    expect(bidirectional.changed).toBe(true);
    expect(authoring(bidirectional.document, 'first').bindings).toEqual({
      'two-way': 'provider:two-way',
    });

    const invalidBatches: readonly {
      readonly command: UiDocumentCommandV2;
      readonly expected: string;
    }[] = [
      {
        command: { type: 'batch', commandId: 'empty', commands: [] },
        expected: 'empty-batch',
      },
      {
        command: {
          type: 'batch',
          commandId: 'outer',
          commands: [
            {
              type: 'batch',
              commandId: 'inner',
              commands: [],
            },
          ],
        } as unknown as UiDocumentCommandV2,
        expected: 'nested-batch',
      },
      {
        command: {
          type: 'batch',
          commandId: 'duplicates',
          commands: [
            {
              type: 'set-property',
              commandId: 'same',
              nodeId: 'first',
              propertyId: 'text',
              value: { kind: 'literal', value: 'A' },
            },
            {
              type: 'set-property',
              commandId: 'same',
              nodeId: 'second',
              propertyId: 'text',
              value: { kind: 'literal', value: 'B' },
            },
          ],
        },
        expected: 'duplicate-command-id',
      },
      {
        command: {
          type: 'batch',
          commandId: 'collides',
          commands: [
            {
              type: 'set-property',
              commandId: 'collides',
              nodeId: 'first',
              propertyId: 'text',
              value: { kind: 'literal', value: 'A' },
            },
          ],
        },
        expected: 'duplicate-command-id',
      },
    ];

    for (const entry of invalidBatches) {
      const result = applyUiDocumentCommandV2(document, entry.command, context());
      expect(issueCodes(result), entry.command.commandId).toContain(entry.expected);
      expect(result.document, entry.command.commandId).toBe(document);
      expect(result).toMatchObject({ changed: false, transaction: null });
    }
  });

  it('applies insert, binding, and property edits as one revision and one history record', () => {
    const document = createFixtureDocument();
    const before = createUiAuthoringSessionV2(document, ['first']);
    const result = applyUiAuthoringSessionCommandV2(
      before,
      {
        type: 'batch',
        commandId: 'compose-new-node',
        commands: [
          {
            type: 'insert-node',
            commandId: 'insert-third',
            parentId: 'root',
            index: 2,
            node: authored('third', 'text', { text: 'Third' }),
          },
          {
            type: 'set-input-binding',
            commandId: 'bind-third',
            nodeId: 'third',
            inputId: 'value',
            bindingId: 'provider:third',
          },
          {
            type: 'set-property',
            commandId: 'label-third',
            nodeId: 'third',
            propertyId: 'label',
            value: { kind: 'literal', value: 'Third label' },
          },
        ],
      },
      context(),
    );

    expect(result.commandResult.issues).toEqual([]);
    expect(result.state.document.revision).toBe(1);
    expect(result.state.past).toHaveLength(1);
    expect(result.state.future).toEqual([]);
    expect(result.state.selectedNodeIds).toEqual(['first']);
    expect(authoring(result.state.document, 'root').documentSchemaVersion).toBe(1);
    expect(authoring(result.state.document, 'third')).toMatchObject({
      bindings: { value: 'provider:third' },
      properties: { label: { kind: 'literal', value: 'Third label' } },
    });
    expect(result.state.past[0]?.transaction.command).toMatchObject({
      type: 'batch',
      commandId: 'compose-new-node',
    });
  });

  it('rolls back a middle-child failure without changing source, revision, selection, or history', () => {
    const document = createFixtureDocument();
    const before = createUiAuthoringSessionV2(document, ['second', 'first']);
    const result = applyUiAuthoringSessionCommandV2(
      before,
      {
        type: 'batch',
        commandId: 'rollback-middle',
        commands: [
          {
            type: 'set-property',
            commandId: 'first-change',
            nodeId: 'first',
            propertyId: 'text',
            value: { kind: 'literal', value: 'Changed' },
          },
          {
            type: 'set-input-binding',
            commandId: 'missing-endpoint',
            nodeId: 'first',
            inputId: 'missing',
            bindingId: 'provider:value',
          },
          {
            type: 'set-property',
            commandId: 'never-reached',
            nodeId: 'second',
            propertyId: 'text',
            value: { kind: 'literal', value: 'Never' },
          },
        ],
      },
      context(),
    );

    expect(issueCodes(result.commandResult)).toContain('input-unavailable');
    expect(result.state).toBe(before);
    expect(result.commandResult.document).toBe(document);
    expect(result.state.document.source).toBe(document.source);
    expect(result.state.document.revision).toBe(0);
    expect(result.state.selectedNodeIds).toEqual(['second', 'first']);
    expect(result.state.past).toEqual([]);
    expect(result.state.future).toEqual([]);
  });

  it('treats a v0 set-then-clear final source as a no-op without leaving a v1 marker', () => {
    const document = createFixtureDocument();
    const result = applyUiDocumentCommandV2(
      document,
      {
        type: 'batch',
        commandId: 'set-then-clear',
        commands: [
          {
            type: 'set-input-binding',
            commandId: 'temporary-set',
            nodeId: 'first',
            inputId: 'value',
            bindingId: 'provider:temporary',
          },
          {
            type: 'clear-input-binding',
            commandId: 'temporary-clear',
            nodeId: 'first',
            inputId: 'value',
          },
        ],
      },
      context(),
    );

    expect(result).toMatchObject({ changed: false, transaction: null, issues: [] });
    expect(result.document).toBe(document);
    expect(authoring(result.document, 'root').documentSchemaVersion).toBeUndefined();
  });

  it('replays set-clear-property transaction patches to the exact canonical v0 final root', () => {
    const document = createFixtureDocument();
    const result = applyUiDocumentCommandV2(
      document,
      {
        type: 'batch',
        commandId: 'temporary-binding-with-property',
        commands: [
          {
            type: 'set-input-binding',
            commandId: 'set-temporary-binding',
            nodeId: 'first',
            inputId: 'value',
            bindingId: 'provider:temporary',
          },
          {
            type: 'clear-input-binding',
            commandId: 'clear-temporary-binding',
            nodeId: 'first',
            inputId: 'value',
          },
          {
            type: 'set-property',
            commandId: 'persist-property-change',
            nodeId: 'first',
            propertyId: 'subtitle',
            value: { kind: 'literal', value: 'Persisted' },
          },
        ],
      },
      context(),
    );

    expect(result.changed).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.transaction).not.toBeNull();
    expect(authoring(result.document, 'root').documentSchemaVersion).toBeUndefined();

    let replayedRoot: GenericWidget = document.root;
    for (const patch of result.transaction!.patches) {
      const replayed = applyWidgetPatch(replayedRoot, patch);
      expect(replayed.changed).toBe(true);
      replayedRoot = replayed.root;
    }
    expect(sourceFor(replayedRoot)).toBe(result.document.source);
  });

  it('repairs selection once and restores the complete batch with one-step undo and redo', () => {
    const document = createFixtureDocument();
    const before = createUiAuthoringSessionV2(document, ['second', 'first']);
    const applied = applyUiAuthoringSessionCommandV2(
      before,
      {
        type: 'batch',
        commandId: 'remove-and-edit',
        commands: [
          {
            type: 'remove-node',
            commandId: 'remove-second',
            nodeId: 'second',
          },
          {
            type: 'set-property',
            commandId: 'edit-first',
            nodeId: 'first',
            propertyId: 'text',
            value: { kind: 'literal', value: 'Edited' },
          },
        ],
      },
      context(),
    );

    expect(applied.state.document.revision).toBe(1);
    expect(applied.state.selectedNodeIds).toEqual(['first']);
    expect(applied.state.past).toHaveLength(1);
    expect(applied.state.past[0]).toMatchObject({
      beforeSelectedNodeIds: ['second', 'first'],
      afterSelectedNodeIds: ['first'],
    });

    const undone = undoUiAuthoringSessionV2(applied.state)!;
    expect(undone.document.source).toBe(document.source);
    expect(undone.document.revision).toBe(0);
    expect(undone.selectedNodeIds).toEqual(['second', 'first']);
    expect(undone.future).toHaveLength(1);

    const redone = redoUiAuthoringSessionV2(undone)!;
    expect(redone.document.source).toBe(applied.state.document.source);
    expect(redone.document.revision).toBe(1);
    expect(redone.selectedNodeIds).toEqual(['first']);
    expect(redone.past).toHaveLength(1);
  });
});

describe('UiDocument V1 compatibility around V2 state', () => {
  it('preserves v1 endpoint state through ordinary V1 property edits', () => {
    const bound = applyUiDocumentCommandV2(
      createFixtureDocument(),
      {
        type: 'set-input-binding',
        commandId: 'bind-before-v1-edit',
        nodeId: 'first',
        inputId: 'value',
        bindingId: 'provider:value',
      },
      context(),
    ).document;
    const edited = applyUiDocumentCommand(bound, {
      type: 'set-property',
      commandId: 'v1-property-edit',
      nodeId: 'second',
      propertyId: 'text',
      value: { kind: 'literal', value: 'V1 edit' },
    });

    expect(edited.issues).toEqual([]);
    expect(edited.changed).toBe(true);
    expect(authoring(edited.document, 'root').documentSchemaVersion).toBe(1);
    expect(authoring(edited.document, 'first').bindings).toEqual({ value: 'provider:value' });
  });

  it('rejects V1 insert/add/change/drop bypasses and write-locks unsupported future documents', () => {
    const document = createFixtureDocument();
    const insertBase = authored('inserted', 'text');
    const insertWithBinding = {
      ...insertBase,
      $authoring: {
        ...insertBase.$authoring,
        documentSchemaVersion: 1,
        bindings: { value: 'provider:inserted' },
      },
    } as UiDocumentNode;
    const insert = applyUiDocumentCommand(document, {
      type: 'insert-node',
      commandId: 'v1-insert-binding',
      parentId: 'root',
      index: 0,
      node: insertWithBinding,
    });
    expect(insert.changed).toBe(false);
    expect(insert.document).toBe(document);
    expect(issueCodes(insert)).toContain('bindings-require-document-schema-version');

    const bound = applyUiDocumentCommandV2(
      document,
      {
        type: 'set-input-binding',
        commandId: 'bind-before-bypass',
        nodeId: 'first',
        inputId: 'value',
        bindingId: 'provider:value',
      },
      context(),
    ).document;
    const current = node(bound, 'first');
    const authoringWithoutBindings: UiDocumentNode['$authoring'] = {
      component: current.$authoring.component,
      properties: current.$authoring.properties,
    };
    const dropped = applyUiDocumentCommand(bound, {
      type: 'replace-node',
      commandId: 'drop-binding',
      nodeId: 'first',
      node: {
        ...current,
        $authoring: authoringWithoutBindings,
      } as unknown as UiDocumentNode,
    });
    expect(dropped.changed).toBe(false);
    expect(dropped.document).toBe(bound);
    expect(issueCodes(dropped)).toContain('invalid-input-binding');

    const changed = applyUiDocumentCommand(bound, {
      type: 'replace-node',
      commandId: 'change-binding',
      nodeId: 'first',
      node: {
        ...current,
        $authoring: {
          ...current.$authoring,
          bindings: { value: 'provider:changed' },
        },
      } as UiDocumentNode,
    });
    expect(changed.changed).toBe(false);
    expect(changed.document).toBe(bound);
    expect(issueCodes(changed)).toContain('invalid-input-binding');

    const futureRoot = {
      ...document.root,
      $authoring: {
        ...document.root.$authoring,
        documentSchemaVersion: 2,
      },
    } as unknown as UiDocumentNode;
    const futureSource = sourceFor(futureRoot);
    const parsedFuture = createUiDocument('future', futureSource);
    expect(parsedFuture.document).toBeNull();
    expect(issueCodes(parsedFuture)).toContain('unsupported-document-schema-version');
    expect(futureSource).toContain('documentSchemaVersion');

    const futureDocument = {
      ...document,
      root: futureRoot,
      source: futureSource,
    } as UiDocument;
    const futureEdit = applyUiDocumentCommand(futureDocument, {
      type: 'set-property',
      commandId: 'future-write-bypass',
      nodeId: 'first',
      propertyId: 'text',
      value: { kind: 'literal', value: 'blocked' },
    });
    expect(futureEdit.changed).toBe(false);
    expect(futureEdit.document).toBe(futureDocument);
    expect(issueCodes(futureEdit)).toContain('unsupported-document-schema-version');
  });

  it('allows V1 replace-node to preserve an existing child binding map exactly', () => {
    const bound = applyUiDocumentCommandV2(
      createFixtureDocument(),
      {
        type: 'set-input-binding',
        commandId: 'bind-before-exact-replace',
        nodeId: 'first',
        inputId: 'value',
        bindingId: 'provider:value',
      },
      context(),
    ).document;
    const current = node(bound, 'first');
    const replaced = applyUiDocumentCommand(bound, {
      type: 'replace-node',
      commandId: 'replace-preserving-binding',
      nodeId: 'first',
      node: { ...current, text: 'Replacement content' } as UiDocumentNode,
    });

    expect(replaced.issues).toEqual([]);
    expect(replaced.changed).toBe(true);
    expect(node(replaced.document, 'first')).toMatchObject({ text: 'Replacement content' });
    expect(authoring(replaced.document, 'first').bindings).toEqual({ value: 'provider:value' });
    expect(authoring(replaced.document, 'root').documentSchemaVersion).toBe(1);
  });
});
