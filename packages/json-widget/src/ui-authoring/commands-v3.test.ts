import type {
  UiComponentCatalogContract,
  UiComponentDescriptor,
  UiComponentRef,
  UiLayoutPropertyDescriptor,
  UiLayoutStrategyDescriptor,
} from '@workbench-kit/contracts';
import { describe, expect, it } from 'vitest';

import { formatWidgetDocumentJson } from '../document/document.js';
import { collectWidgetNodes, type GenericWidget } from '../widget/tree.js';
import { applyUiDocumentCommandV3 } from './commands-v3.js';
import { createUiDocumentV3, readUiDocumentNodeAuthoringV3 } from './document-v3.js';
import { projectUiAuthoringDocumentV3 } from './projection-v3.js';
import {
  applyUiAuthoringSessionCommandV3,
  createUiAuthoringSessionV3,
  redoUiAuthoringSessionV3,
  undoUiAuthoringSessionV3,
} from './session-v3.js';
import type {
  UiDocumentCommandV3Context,
  UiDocumentNode,
  UiDocumentNodeV3,
  UiDocumentV3,
} from './types.js';

const COMPONENTS: readonly UiComponentDescriptor[] = Object.freeze([
  {
    id: 'test:column',
    version: '1.0.0',
    kind: 'atomic',
    properties: [{ id: 'title', value: { type: 'string' } }],
    layout: { supportedStrategyIds: ['builtin.flex'] },
    designTime: { label: 'Column' },
  },
  {
    id: 'test:text',
    version: '1.0.0',
    kind: 'atomic',
    properties: [{ id: 'title', value: { type: 'string' } }],
    bindings: [{ id: 'value', direction: 'input', value: { type: 'string' } }],
    designTime: { label: 'Text' },
  },
]);

const LAYOUT_PROPERTIES: readonly UiLayoutPropertyDescriptor[] = Object.freeze([
  {
    id: 'gap',
    scope: 'container',
    group: 'spacing',
    strategyKinds: ['flex'],
    value: { type: 'layout.spacing', allowedSources: ['token'] },
  },
]);

const LAYOUT_STRATEGIES: readonly UiLayoutStrategyDescriptor[] = Object.freeze([
  {
    id: 'builtin.flex',
    kind: 'flex',
    supportedContainerProperties: ['gap'],
    supportedChildProperties: [],
  },
]);

function catalog(): UiComponentCatalogContract {
  const byRef = new Map(
    COMPONENTS.map((descriptor) => [`${descriptor.id}@${descriptor.version}`, descriptor]),
  );
  return Object.freeze({
    component(ref: UiComponentRef) {
      return byRef.get(`${ref.id}@${ref.version}`);
    },
    components() {
      return COMPONENTS;
    },
  });
}

const CONTEXT: UiDocumentCommandV3Context = Object.freeze({
  componentCatalog: catalog(),
  layoutStrategies: LAYOUT_STRATEGIES,
  layoutProperties: LAYOUT_PROPERTIES,
});

function authored(
  id: string,
  type: 'column' | 'text',
  fields: Readonly<Record<string, unknown>> = {},
): UiDocumentNodeV3 {
  return {
    type,
    id,
    $authoring: {
      component: { id: `test:${type}`, version: '1.0.0' },
      properties: { title: { kind: 'literal', value: `base-${id}` } },
    },
    ...fields,
  } as UiDocumentNodeV3;
}

function fixture(): UiDocumentV3 {
  const result = createUiDocumentV3(
    'v3-commands',
    formatWidgetDocumentJson(
      authored('root', 'column', { children: [authored('child', 'text')] }) as GenericWidget,
    ),
  );
  expect(result.issues).toEqual([]);
  return result.document!;
}

function authoring(document: UiDocumentV3, nodeId: string) {
  const node = collectWidgetNodes(document.root).find(
    (entry) => entry.widget.id === nodeId,
  )!.widget;
  return readUiDocumentNodeAuthoringV3(node)!;
}

describe('UiDocument V3 responsive commands', () => {
  it('promotes once, canonicalizes semantic no-ops, and preserves marker 2 after clear', () => {
    const initial = fixture();
    const added = applyUiDocumentCommandV3(
      initial,
      {
        type: 'upsert-responsive-variant',
        commandId: 'add-compact',
        variant: { id: 'compact', hostWidth: { minInclusive: 0, maxExclusive: 700 } },
      },
      CONTEXT,
    );
    expect(added.changed).toBe(true);
    expect(added.document.revision).toBe(1);
    expect(authoring(added.document, 'root').documentSchemaVersion).toBe(2);

    const reorderedNoOp = applyUiDocumentCommandV3(
      added.document,
      {
        type: 'upsert-responsive-variant',
        commandId: 'same-compact',
        variant: { id: 'compact', hostWidth: { maxExclusive: 700 } },
      },
      CONTEXT,
    );
    expect(reorderedNoOp).toMatchObject({ changed: false, transaction: null });
    expect(reorderedNoOp.document).toBe(added.document);

    const set = applyUiDocumentCommandV3(
      added.document,
      {
        type: 'set-responsive-property',
        commandId: 'set-title',
        nodeId: 'child',
        variantId: 'compact',
        propertyId: 'title',
        value: { kind: 'literal', value: 'compact-title' },
      },
      CONTEXT,
    );
    expect(set.changed).toBe(true);
    expect(authoring(set.document, 'child').responsiveOverrides).toEqual({
      compact: { properties: { title: { kind: 'literal', value: 'compact-title' } } },
    });

    const cleared = applyUiDocumentCommandV3(
      set.document,
      {
        type: 'clear-responsive-property',
        commandId: 'clear-title',
        nodeId: 'child',
        variantId: 'compact',
        propertyId: 'title',
      },
      CONTEXT,
    );
    expect(cleared.changed).toBe(true);
    expect(authoring(cleared.document, 'child').responsiveOverrides).toBeUndefined();
    expect(authoring(cleared.document, 'root').documentSchemaVersion).toBe(2);
  });

  it('validates exact property/layout catalogs and refuses removal while referenced', () => {
    const seeded = applyUiDocumentCommandV3(
      fixture(),
      {
        type: 'batch',
        commandId: 'seed-responsive',
        commands: [
          {
            type: 'upsert-responsive-variant',
            commandId: 'seed-variant',
            variant: { id: 'wide', hostWidth: { minInclusive: 700 } },
          },
          {
            type: 'set-responsive-layout',
            commandId: 'seed-layout',
            nodeId: 'root',
            variantId: 'wide',
            strategyId: 'builtin.flex',
            values: { gap: { kind: 'token', tokenId: 'space.wide' } },
          },
        ],
      },
      CONTEXT,
    );
    expect(seeded.issues).toEqual([]);
    expect(seeded.document.revision).toBe(1);
    expect(seeded.transaction?.nextRevision).toBe(1);

    const remove = applyUiDocumentCommandV3(
      seeded.document,
      { type: 'remove-responsive-variant', commandId: 'remove-wide', variantId: 'wide' },
      CONTEXT,
    );
    expect(remove.changed).toBe(false);
    expect(remove.issues.map((issue) => issue.code)).toContain('responsive-variant-in-use');

    const invalid = applyUiDocumentCommandV3(
      seeded.document,
      {
        type: 'set-responsive-property',
        commandId: 'missing-property',
        nodeId: 'child',
        variantId: 'wide',
        propertyId: 'missing',
        value: { kind: 'literal', value: 'bad' },
      },
      CONTEXT,
    );
    expect(invalid.issues.map((issue) => issue.code)).toContain(
      'invalid-responsive-property-override',
    );
  });

  it('keeps an identical responsive layout out of revision and session history', () => {
    const seeded = applyUiDocumentCommandV3(
      fixture(),
      {
        type: 'batch',
        commandId: 'seed-layout-no-op',
        commands: [
          {
            type: 'upsert-responsive-variant',
            commandId: 'seed-wide',
            variant: { id: 'wide', hostWidth: { minInclusive: 700 } },
          },
          {
            type: 'set-responsive-layout',
            commandId: 'seed-wide-layout',
            nodeId: 'root',
            variantId: 'wide',
            strategyId: 'builtin.flex',
            values: { gap: { kind: 'token', tokenId: 'space.wide' } },
          },
        ],
      },
      CONTEXT,
    ).document;
    const state = createUiAuthoringSessionV3(seeded, ['root']);

    const repeated = applyUiAuthoringSessionCommandV3(
      state,
      {
        type: 'set-responsive-layout',
        commandId: 'repeat-wide-layout',
        nodeId: 'root',
        variantId: 'wide',
        strategyId: 'builtin.flex',
        values: { gap: { kind: 'token', tokenId: 'space.wide' } },
      },
      CONTEXT,
    );

    expect(repeated.commandResult).toMatchObject({ changed: false, transaction: null });
    expect(repeated.commandResult.document).toBe(seeded);
    expect(repeated.state).toBe(state);
    expect(repeated.state.document.revision).toBe(seeded.revision);
    expect(repeated.state.past).toHaveLength(0);
  });

  it('preserves overrides through inherited edits and drops them for full replacement', () => {
    const seeded = applyUiDocumentCommandV3(
      fixture(),
      {
        type: 'batch',
        commandId: 'seed',
        commands: [
          {
            type: 'upsert-responsive-variant',
            commandId: 'variant',
            variant: { id: 'compact', hostWidth: { maxExclusive: 700 } },
          },
          {
            type: 'set-responsive-property',
            commandId: 'override',
            nodeId: 'child',
            variantId: 'compact',
            propertyId: 'title',
            value: { kind: 'literal', value: 'compact' },
          },
        ],
      },
      CONTEXT,
    ).document;
    const edited = applyUiDocumentCommandV3(
      seeded,
      {
        type: 'set-property',
        commandId: 'base-edit',
        nodeId: 'child',
        propertyId: 'title',
        value: { kind: 'literal', value: 'new-base' },
      },
      CONTEXT,
    );
    expect(authoring(edited.document, 'child').responsiveOverrides).toEqual(
      authoring(seeded, 'child').responsiveOverrides,
    );

    const replaced = applyUiDocumentCommandV3(
      edited.document,
      {
        type: 'replace-node',
        commandId: 'replace-child',
        nodeId: 'child',
        node: authored('child', 'text', { text: 'Replacement' }) as UiDocumentNode,
      },
      CONTEXT,
    );
    expect(replaced.changed).toBe(true);
    expect(authoring(replaced.document, 'child').responsiveOverrides).toBeUndefined();

    const rootReplace = applyUiDocumentCommandV3(
      edited.document,
      {
        type: 'replace-node',
        commandId: 'replace-root',
        nodeId: 'root',
        node: authored('root', 'column') as UiDocumentNode,
      },
      CONTEXT,
    );
    expect(rootReplace.issues.map((issue) => issue.code)).toContain('root-structural-command');
  });

  it('keeps V2 batch marker parity and rejects malformed structural payloads without throwing', () => {
    const applied = applyUiDocumentCommandV3(
      fixture(),
      {
        type: 'batch',
        commandId: 'v2-parity',
        commands: [
          {
            type: 'set-input-binding',
            commandId: 'bind',
            nodeId: 'child',
            inputId: 'value',
            bindingId: 'binding:value',
          },
          {
            type: 'clear-input-binding',
            commandId: 'clear-binding',
            nodeId: 'child',
            inputId: 'value',
          },
          {
            type: 'set-property',
            commandId: 'base-change',
            nodeId: 'child',
            propertyId: 'title',
            value: { kind: 'literal', value: 'changed' },
          },
        ],
      },
      CONTEXT,
    );
    expect(applied.changed).toBe(true);
    expect(authoring(applied.document, 'root').documentSchemaVersion).toBeUndefined();

    const malformed = {
      type: 'replace-node',
      commandId: 'malformed',
      nodeId: 'child',
      node: null,
    } as never;
    expect(() => applyUiDocumentCommandV3(applied.document, malformed, CONTEXT)).not.toThrow();
    expect(applyUiDocumentCommandV3(applied.document, malformed, CONTEXT).changed).toBe(false);
  });
});

describe('UiDocument V3 session and projection', () => {
  it('records one batch history step and projects width-derived effective provenance', () => {
    const state = createUiAuthoringSessionV3(fixture(), ['child', 'missing']);
    const applied = applyUiAuthoringSessionCommandV3(
      state,
      {
        type: 'batch',
        commandId: 'responsive-session',
        commands: [
          {
            type: 'upsert-responsive-variant',
            commandId: 'compact',
            variant: { id: 'compact', hostWidth: { maxExclusive: 700 } },
          },
          {
            type: 'set-responsive-property',
            commandId: 'compact-title',
            nodeId: 'child',
            variantId: 'compact',
            propertyId: 'title',
            value: { kind: 'literal', value: 'compact' },
          },
        ],
      },
      CONTEXT,
    );
    expect(applied.state.past).toHaveLength(1);
    expect(applied.state.selectedNodeIds).toEqual(['child']);
    expect(undoUiAuthoringSessionV3(applied.state)?.document.revision).toBe(0);
    expect(
      redoUiAuthoringSessionV3(undoUiAuthoringSessionV3(applied.state)!)?.document.revision,
    ).toBe(1);

    const projection = projectUiAuthoringDocumentV3(applied.state, CONTEXT, {
      previewHostWidth: 500,
      editingTarget: { kind: 'variant', variantId: 'compact' },
    });
    expect(projection.designSystem).toBeNull();
    expect(projection.responsiveVariants).toEqual([
      { id: 'compact', hostWidth: { maxExclusive: 700 } },
    ]);
    expect(projection.activeResponsiveVariantId).toBe('compact');
    expect(projection.nodes.find((node) => node.nodeId === 'child')?.properties.title).toEqual({
      value: { kind: 'literal', value: 'compact' },
      provenance: { kind: 'responsive-override', variantId: 'compact' },
    });
  });
});

describe('wire 3 composition commands in the existing V3 session', () => {
  const declaration = {
    interfaceVersion: '1',
    parameters: [{ id: 'title', label: 'Title', target: { nodeId: 'child', propertyId: 'title' } }],
  };
  const reference = (id: string): UiDocumentNode => ({
    id,
    type: 'composition-instance',
    $authoring: { component: { id: 'ui-document:definition', version: '1' }, properties: {} },
  });

  it('promotes a wire2 instance insertion atomically and Undo restores the exact historical source', () => {
    const responsive = applyUiDocumentCommandV3(
      fixture(),
      {
        type: 'upsert-responsive-variant',
        commandId: 'responsive',
        variant: { id: 'wide', hostWidth: { minInclusive: 900 } },
      },
      CONTEXT,
    ).document;
    const state = createUiAuthoringSessionV3(responsive, ['child']);
    const applied = applyUiAuthoringSessionCommandV3(
      state,
      {
        type: 'insert-node',
        commandId: 'insert',
        parentId: 'root',
        index: 1,
        node: reference('instance'),
      },
      CONTEXT,
    );
    expect(applied.commandResult.issues).toEqual([]);
    expect(applied.state.past).toHaveLength(1);
    expect(authoring(applied.state.document, 'root')).toMatchObject({
      documentSchemaVersion: 3,
      responsiveVariants: [{ id: 'wide', hostWidth: { minInclusive: 900 } }],
    });
    expect(authoring(applied.state.document, 'instance').properties).toEqual({});
    const undone = undoUiAuthoringSessionV3(applied.state)!;
    expect(undone.document.source).toBe(state.document.source);
    expect(authoring(undone.document, 'root').documentSchemaVersion).toBe(2);
    expect(redoUiAuthoringSessionV3(undone)!.document.source).toBe(applied.state.document.source);
  });

  it('keeps declaration, wire and responsive metadata across inherited operations and undo/redo', () => {
    let state = createUiAuthoringSessionV3(fixture(), ['child']);
    const declared = applyUiAuthoringSessionCommandV3(
      state,
      {
        type: 'set-composition-definition',
        commandId: 'declare',
        definition: declaration,
      },
      CONTEXT,
    );
    expect(declared.commandResult.issues).toEqual([]);
    state = declared.state;
    const changed = applyUiAuthoringSessionCommandV3(
      state,
      {
        type: 'batch',
        commandId: 'edit',
        commands: [
          {
            type: 'set-property',
            commandId: 'root-label',
            nodeId: 'root',
            propertyId: 'title',
            value: { kind: 'literal', value: 'New label' },
          },
          {
            type: 'set-property',
            commandId: 'default',
            nodeId: 'child',
            propertyId: 'title',
            value: { kind: 'literal', value: '${item.title}' },
          },
          {
            type: 'upsert-responsive-variant',
            commandId: 'variant',
            variant: { id: 'wide', hostWidth: { minInclusive: 900 } },
          },
          {
            type: 'set-input-binding',
            commandId: 'binding',
            nodeId: 'child',
            inputId: 'value',
            bindingId: 'binding:one',
          },
          { type: 'clear-input-binding', commandId: 'clear', nodeId: 'child', inputId: 'value' },
        ],
      },
      CONTEXT,
    );
    expect(changed.commandResult.issues).toEqual([]);
    expect(authoring(changed.state.document, 'root')).toMatchObject({
      documentSchemaVersion: 3,
      compositionDefinition: declaration,
    });
    expect(authoring(changed.state.document, 'child').properties.title).toEqual({
      kind: 'literal',
      value: '${item.title}',
    });
    expect(undoUiAuthoringSessionV3(changed.state)!.document.source).toBe(state.document.source);
    expect(
      redoUiAuthoringSessionV3(undoUiAuthoringSessionV3(changed.state)!)!.document.source,
    ).toBe(changed.state.document.source);
    const removed = applyUiAuthoringSessionCommandV3(
      changed.state,
      { type: 'set-composition-definition', commandId: 'remove-declaration' },
      CONTEXT,
    );
    expect(removed.commandResult.issues).toEqual([]);
    expect(authoring(removed.state.document, 'root').compositionDefinition).toBeUndefined();
    expect(authoring(removed.state.document, 'root').documentSchemaVersion).toBe(3);
    expect(undoUiAuthoringSessionV3(removed.state)!.document.source).toBe(
      changed.state.document.source,
    );
  });

  it('promotes replacement/batch reference insertion and rejects copied children without history', () => {
    const state = createUiAuthoringSessionV3(fixture());
    const replaced = applyUiAuthoringSessionCommandV3(
      state,
      {
        type: 'replace-node',
        commandId: 'replace',
        nodeId: 'child',
        node: reference('child'),
      },
      CONTEXT,
    );
    expect(replaced.commandResult.issues).toEqual([]);
    expect(authoring(replaced.state.document, 'root').documentSchemaVersion).toBe(3);
    const failed = applyUiAuthoringSessionCommandV3(
      state,
      {
        type: 'batch',
        commandId: 'failed',
        commands: [
          {
            type: 'insert-node',
            commandId: 'first',
            parentId: 'root',
            index: 1,
            node: reference('first'),
          },
          {
            type: 'insert-node',
            commandId: 'second',
            parentId: 'root',
            index: 2,
            node: { ...reference('second'), children: [authored('copied', 'text')] },
          },
        ],
      },
      CONTEXT,
    );
    expect(failed.commandResult.changed).toBe(false);
    expect(failed.state).toBe(state);
    expect(failed.state.document.source).toBe(state.document.source);
    expect(failed.state.past).toEqual([]);
  });

  it('never turns ephemeral projected ids into authored command targets', () => {
    const state = createUiAuthoringSessionV3(fixture());
    const result = applyUiAuthoringSessionCommandV3(
      state,
      {
        type: 'set-property',
        commandId: 'projected',
        nodeId: 'ui-instance:projection',
        propertyId: 'title',
        value: { kind: 'literal', value: 'invalid' },
      },
      CONTEXT,
    );
    expect(result.state).toBe(state);
    expect(result.commandResult.issues[0]?.code).toBe('node-not-found');
  });
});

it('rejects promotion of an old-wire authored projected-prefix id without changing source or history', () => {
  const root = authored('root', 'column', {
    $authoring: {
      component: { id: 'test:column', version: '1.0.0' },
      properties: {},
      documentSchemaVersion: 2,
    },
    children: [authored('ui-instance:legacy-authored', 'text')],
  });
  const parsed = createUiDocumentV3('legacy-prefix', formatWidgetDocumentJson(root));
  expect(parsed.issues).toEqual([]);
  expect(createUiDocumentV3('legacy-prefix', parsed.document!.source).document!.source).toBe(
    parsed.document!.source,
  );
  const state = createUiAuthoringSessionV3(parsed.document!, ['ui-instance:legacy-authored']);
  const result = applyUiAuthoringSessionCommandV3(
    state,
    {
      type: 'insert-node',
      commandId: 'promote',
      parentId: 'root',
      index: 1,
      node: {
        type: 'composition-instance',
        id: 'instance',
        $authoring: {
          component: { id: 'ui-document:definition', version: '1' },
          properties: {},
        },
      },
    },
    CONTEXT,
  );
  expect(result.commandResult.changed).toBe(false);
  expect(result.commandResult.issues.map(({ code }) => code)).toContain(
    'invalid-composition-instance',
  );
  expect(result.state).toBe(state);
  expect(result.state.document.source).toBe(parsed.document!.source);
  expect(result.state.document.root.$authoring.documentSchemaVersion).toBe(2);
  expect(result.state.selectedNodeIds).toEqual(['ui-instance:legacy-authored']);
  expect(result.state.past).toEqual([]);
  expect(result.state.future).toEqual([]);
});
