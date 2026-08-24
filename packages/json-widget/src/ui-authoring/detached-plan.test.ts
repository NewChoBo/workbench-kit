import {
  resolveUiComponentCatalog,
  type UiComponentCatalogContract,
} from '@workbench-kit/contracts';
import { describe, expect, it, vi } from 'vitest';

import { formatWidgetDocumentJson } from '../document/document.js';
import { collectWidgetNodes, type GenericWidget } from '../widget/tree.js';
import { applyUiDocumentCommandV2 } from './commands-v2.js';
import {
  createUiAuthoringDetachedPlan,
  finalizeUiAuthoringDetachedPlan,
  previewUiAuthoringDetachedPlan,
} from './detached-plan.js';
import { createUiDocument, readUiDocumentNodeAuthoring } from './document.js';
import { projectUiAuthoringDocument } from './projection.js';
import { createUiAuthoringSessionV2 } from './session-v2.js';
import type { UiDocument, UiDocumentNode } from './types.js';

function node(
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

function documentFor(root: GenericWidget = node('root', 'text')): UiDocument {
  const result = createUiDocument('plan-doc', formatWidgetDocumentJson(root));
  expect(result.issues).toEqual([]);
  return result.document!;
}

function catalog(): UiComponentCatalogContract {
  return resolveUiComponentCatalog([
    {
      contributorId: 'test',
      components: [
        {
          id: 'test:text',
          version: '1.0.0',
          kind: 'atomic',
          designTime: { label: 'Text' },
          bindings: [
            {
              id: 'value',
              direction: 'input',
              value: { type: 'string', allowedSources: ['binding'] },
            },
            {
              id: 'changed',
              direction: 'output',
              value: { type: 'string', allowedSources: ['binding'] },
            },
          ],
        },
        {
          id: 'test:text',
          version: '2.0.0',
          kind: 'atomic',
          designTime: { label: 'Text V2' },
          bindings: [
            {
              id: 'value',
              direction: 'input',
              value: { type: 'string', allowedSources: ['binding'] },
            },
          ],
        },
      ],
    },
  ]).catalog;
}

const recipe = Object.freeze({
  id: 'test.recipe',
  version: '1.0.0',
  provenance: Object.freeze({
    source: 'builtin' as const,
    sourceId: 'test',
    sourceVersion: '1.0.0',
  }),
});

describe('detached UI authoring plans', () => {
  it('captures only referenced endpoints and previews without mutating session state', () => {
    const state = createUiAuthoringSessionV2(documentFor());
    const baseCatalog = catalog();
    const component = vi.fn(baseCatalog.component.bind(baseCatalog));
    const componentCatalog: UiComponentCatalogContract = {
      component,
      components: vi.fn(() => {
        throw new Error('global scan is not allowed');
      }),
    };
    const command = {
      type: 'set-input-binding' as const,
      commandId: 'bind-value',
      nodeId: 'root',
      inputId: 'value',
      bindingId: 'binding.primary',
    };

    const plan = createUiAuthoringDetachedPlan({
      planId: 'apply-recipe',
      recipe,
      state,
      designSystemInput: { state: null, registryRevision: 3, hostWidth: 720 },
      componentCatalog,
      commands: [command],
    });
    const preview = previewUiAuthoringDetachedPlan(plan);

    expect(plan).toMatchObject({ blocked: false, documentRevision: 0 });
    expect(plan.endpointSnapshots).toHaveLength(1);
    expect(preview).toMatchObject({ blocked: false, commands: [command] });
    expect(state.document.revision).toBe(0);
    expect(state.past).toEqual([]);
    expect(component).toHaveBeenCalled();

    expect(
      finalizeUiAuthoringDetachedPlan(plan, {
        state,
        designSystemInput: { state: null, registryRevision: 3, hostWidth: 720 },
        componentCatalog,
      }),
    ).toMatchObject({
      command: { type: 'batch', commandId: 'apply-recipe', commands: [command] },
      diagnostics: [],
    });
  });

  it('finalizes and applies an insert-node followed by binding the inserted endpoint', () => {
    const componentCatalog = catalog();
    const state = createUiAuthoringSessionV2(documentFor(node('root', 'column', { children: [] })));
    const commands = [
      {
        type: 'insert-node' as const,
        commandId: 'insert-bound-node',
        parentId: 'root',
        index: 0,
        node: node('inserted', 'text'),
      },
      {
        type: 'set-input-binding' as const,
        commandId: 'bind-inserted-node',
        nodeId: 'inserted',
        inputId: 'value',
        bindingId: 'binding.inserted',
      },
    ];
    const plan = createUiAuthoringDetachedPlan({
      planId: 'insert-and-bind',
      recipe,
      state,
      designSystemInput: { state: null, registryRevision: 3 },
      componentCatalog,
      commands,
    });

    expect(plan.blocked).toBe(false);
    expect(plan.endpointSnapshots).toMatchObject([
      { nodeId: 'inserted', component: { id: 'test:text', version: '1.0.0' } },
    ]);
    const finalized = finalizeUiAuthoringDetachedPlan(plan, {
      state,
      designSystemInput: { state: null, registryRevision: 3 },
      componentCatalog,
    });
    expect(finalized).toMatchObject({
      command: { type: 'batch', commandId: 'insert-and-bind', commands },
      diagnostics: [],
    });

    const applied = applyUiDocumentCommandV2(state.document, finalized.command!, {
      componentCatalog,
    });
    expect(applied.issues).toEqual([]);
    expect(applied.changed).toBe(true);
    const inserted = collectWidgetNodes(applied.document.root).find(
      (entry) => entry.widget.id === 'inserted',
    )!.widget;
    expect(readUiDocumentNodeAuthoring(inserted)?.bindings).toEqual({
      value: 'binding.inserted',
    });
  });

  it('finalizes a component replacement followed by binding its new exact endpoint', () => {
    const componentCatalog = catalog();
    const state = createUiAuthoringSessionV2(
      documentFor(node('root', 'column', { children: [node('target', 'text')] })),
    );
    const replacement = node('target', 'text', {
      $authoring: {
        component: { id: 'test:text', version: '2.0.0' },
        properties: {},
      },
    });
    const commands = [
      {
        type: 'replace-node' as const,
        commandId: 'replace-component-version',
        nodeId: 'target',
        node: replacement,
      },
      {
        type: 'set-input-binding' as const,
        commandId: 'bind-replaced-component',
        nodeId: 'target',
        inputId: 'value',
        bindingId: 'binding.replaced',
      },
    ];
    const plan = createUiAuthoringDetachedPlan({
      planId: 'replace-and-bind',
      recipe,
      state,
      designSystemInput: { state: null, registryRevision: 3 },
      componentCatalog,
      commands,
    });

    expect(plan.blocked).toBe(false);
    expect(plan.endpointSnapshots).toMatchObject([
      { nodeId: 'target', component: { id: 'test:text', version: '2.0.0' } },
    ]);
    const finalized = finalizeUiAuthoringDetachedPlan(plan, {
      state,
      designSystemInput: { state: null, registryRevision: 3 },
      componentCatalog,
    });
    expect(finalized).toMatchObject({
      command: { type: 'batch', commandId: 'replace-and-bind', commands },
      diagnostics: [],
    });

    const applied = applyUiDocumentCommandV2(state.document, finalized.command!, {
      componentCatalog,
    });
    expect(applied.issues).toEqual([]);
    expect(applied.changed).toBe(true);
    const target = collectWidgetNodes(applied.document.root).find(
      (entry) => entry.widget.id === 'target',
    )!.widget;
    expect(readUiDocumentNodeAuthoring(target)).toMatchObject({
      component: { id: 'test:text', version: '2.0.0' },
      bindings: { value: 'binding.replaced' },
    });
  });

  it('fails finalization closed when document, Design System, or endpoint operands drift', () => {
    const state = createUiAuthoringSessionV2(documentFor());
    const initialCatalog = catalog();
    const plan = createUiAuthoringDetachedPlan({
      planId: 'apply-recipe',
      recipe,
      state,
      designSystemInput: { state: null, registryRevision: 3, hostWidth: 720 },
      componentCatalog: initialCatalog,
      commands: [
        {
          type: 'set-input-binding',
          commandId: 'bind-value',
          nodeId: 'root',
          inputId: 'value',
          bindingId: 'binding.primary',
        },
      ],
    });
    const changed = applyUiDocumentCommandV2(
      state.document,
      {
        type: 'set-input-binding',
        commandId: 'outside-change',
        nodeId: 'root',
        inputId: 'value',
        bindingId: 'binding.other',
      },
      { componentCatalog: initialCatalog },
    ).document;
    const changedCatalog = resolveUiComponentCatalog([
      {
        contributorId: 'test',
        components: [
          {
            id: 'test:text',
            version: '1.0.0',
            kind: 'atomic',
            designTime: { label: 'Text' },
            bindings: [
              {
                id: 'value',
                direction: 'bidirectional',
                value: { type: 'string', allowedSources: ['binding'] },
              },
            ],
          },
        ],
      },
    ]).catalog;

    const finalized = finalizeUiAuthoringDetachedPlan(plan, {
      state: createUiAuthoringSessionV2(changed),
      designSystemInput: { state: null, registryRevision: 4, hostWidth: 900 },
      componentCatalog: changedCatalog,
    });
    expect(finalized.command).toBeUndefined();
    expect(finalized.diagnostics.map((entry) => entry.code)).toEqual([
      'stale-document',
      'stale-design-system',
      'stale-component-catalog',
    ]);
  });

  it('blocks invalid or output-only endpoint plans before Preview can become executable', () => {
    const state = createUiAuthoringSessionV2(documentFor());
    const plan = createUiAuthoringDetachedPlan({
      planId: 'output-plan',
      recipe,
      state,
      designSystemInput: { state: null, registryRevision: 1 },
      componentCatalog: catalog(),
      commands: [
        {
          type: 'set-input-binding',
          commandId: 'bind-output',
          nodeId: 'root',
          inputId: 'changed',
          bindingId: 'binding.invalid',
        },
      ],
    });
    expect(plan.blocked).toBe(true);
    expect(plan.diagnostics.some((entry) => entry.cause?.code === 'input-output-only')).toBe(true);
    expect(
      finalizeUiAuthoringDetachedPlan(plan, {
        state,
        designSystemInput: { state: null, registryRevision: 1 },
        componentCatalog: catalog(),
      }).command,
    ).toBeUndefined();
  });
});

describe('UI authoring document projection', () => {
  it('projects exact assignability, opaque bindings, provenance, selection, and unknown inputs', () => {
    const root = node('root', 'text', {
      $authoring: {
        documentSchemaVersion: 1,
        component: { id: 'test:text', version: '1.0.0' },
        properties: {},
        bindings: { value: 'binding.primary', removed: 'binding.orphaned' },
      },
    });
    const state = createUiAuthoringSessionV2(documentFor(root), ['root']);
    const projection = projectUiAuthoringDocument(state, { componentCatalog: catalog() });

    expect(projection.nodes[0]).toMatchObject({
      nodeId: 'root',
      selected: true,
      bindings: [
        {
          input: { id: 'value' },
          bindingId: 'binding.primary',
          assignable: true,
          reason: 'available',
          provenance: { kind: 'document-input-binding' },
        },
        {
          input: { id: 'changed' },
          assignable: false,
          reason: 'input-output-only',
          provenance: null,
        },
      ],
    });
    expect(projection.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'input-unavailable', inputId: 'removed' }),
      ]),
    );
  });
});
