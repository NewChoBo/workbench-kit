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
