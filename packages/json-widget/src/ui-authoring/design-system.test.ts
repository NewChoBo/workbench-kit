import { describe, expect, it } from 'vitest';

import type { DesignSystemPackChangeMutation, UiDesignSystemState } from '@workbench-kit/contracts';

import { formatWidgetDocumentJson } from '../document/document.js';
import type { GenericWidget } from '../widget/tree.js';
import { createUiDocument, readUiDocumentNodeAuthoring } from './document.js';
import { applyUiDesignSystemPackChange, projectUiDesignSystemDocument } from './design-system.js';
import {
  applyUiAuthoringSessionCommand,
  createUiAuthoringSession,
  redoUiAuthoringSession,
  undoUiAuthoringSession,
} from './session.js';

const sourceRef = Object.freeze({ id: 'source.design', version: '1.0.0' });
const targetRef = Object.freeze({ id: 'target.design', version: '2.0.0' });

function state(pack = sourceRef): UiDesignSystemState {
  return {
    pack,
    theme: { pack, themeId: 'light' },
    scopes: {
      panel: {
        theme: { pack, themeId: 'dark' },
        tokenOverrides: {
          'color.old': { kind: 'resource', resourceId: 'image.old' },
        },
      },
    },
  };
}

function authoredDocument(): GenericWidget {
  return {
    type: 'column',
    id: 'root',
    $authoring: {
      component: { id: 'layout.column', version: '1.0.0' },
      properties: {
        color: { kind: 'token', tokenId: 'color.old' },
        binding: { kind: 'binding', bindingId: 'profile.name' },
        expression: { kind: 'expression', expressionId: 'format.name' },
      },
      designSystem: state(),
      layout: {
        strategyId: 'layout.flex',
        values: { gap: { kind: 'token', tokenId: 'space.old' } },
      },
    },
    children: [
      {
        type: 'text',
        id: 'child',
        text: 'Hello',
        $authoring: {
          component: { id: 'content.text', version: '1.0.0' },
          properties: { icon: { kind: 'resource', resourceId: 'image.old' } },
          themeScopeId: 'panel',
        },
      },
    ],
  };
}

function createDocument() {
  const result = createUiDocument('design-document', formatWidgetDocumentJson(authoredDocument()));
  expect(result.issues).toEqual([]);
  return result.document!;
}

describe('UI Design System persistence and projection', () => {
  it('persists root state and projects document-order nodes with root-to-leaf scope chains', () => {
    const document = createDocument();
    const projection = projectUiDesignSystemDocument(document);

    expect(document.designSystem).toEqual(state());
    expect(projection.diagnostics).toEqual([]);
    expect(projection.document).toMatchObject({
      documentId: 'design-document',
      revision: 0,
      state: state(),
      nodes: [
        { nodeId: 'root', scopeChain: [] },
        { nodeId: 'child', scopeChain: ['panel'] },
      ],
    });
    expect(Object.isFrozen(projection.document)).toBe(true);
    expect(Object.isFrozen(projection.document?.nodes)).toBe(true);
    const reloaded = createUiDocument('design-document', document.source);
    expect(reloaded.issues).toEqual([]);
    expect(reloaded.document?.designSystem).toEqual(document.designSystem);
    expect(projectUiDesignSystemDocument(reloaded.document!).document).toEqual(projection.document);
  });

  it('keeps historical documents loadable but requires explicit state for pack-change planning', () => {
    const root = authoredDocument();
    delete (root.$authoring as Record<string, unknown>).designSystem;
    const result = createUiDocument('historical', formatWidgetDocumentJson(root));

    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'theme-scope-without-state', nodeId: 'child' }),
    ]);

    delete ((root.children as GenericWidget[])[0]!.$authoring as Record<string, unknown>)
      .themeScopeId;
    const historical = createUiDocument('historical', formatWidgetDocumentJson(root));
    expect(historical.issues).toEqual([]);
    const projection = projectUiDesignSystemDocument(historical.document!);
    expect(projection.document).toBeUndefined();
    expect(projection.diagnostics).toEqual([
      expect.objectContaining({ code: 'source-design-system-state-required' }),
    ]);
  });

  it('rejects non-root state, unknown scopes, and repeated scope ids on one ancestry path', () => {
    const root = authoredDocument();
    const child = (root.children as GenericWidget[])[0]!;
    (child.$authoring as Record<string, unknown>).designSystem = state();
    (child.$authoring as Record<string, unknown>).themeScopeId = 'missing';
    expect(
      createUiDocument('invalid', formatWidgetDocumentJson(root)).issues.map((issue) => issue.code),
    ).toEqual(['nonroot-design-system-state', 'theme-scope-not-found']);

    delete (child.$authoring as Record<string, unknown>).designSystem;
    (child.$authoring as Record<string, unknown>).themeScopeId = 'panel';
    child.children = [
      {
        type: 'text',
        id: 'grandchild',
        $authoring: {
          component: { id: 'content.text', version: '1.0.0' },
          properties: {},
          themeScopeId: 'panel',
        },
      },
    ];
    expect(createUiDocument('invalid', formatWidgetDocumentJson(root)).issues).toContainEqual(
      expect.objectContaining({ code: 'duplicate-active-theme-scope', nodeId: 'grandchild' }),
    );

    (child.$authoring as Record<string, unknown>).themeScopeId = ' panel ';
    delete child.children;
    expect(createUiDocument('invalid', formatWidgetDocumentJson(root)).issues).toContainEqual(
      expect.objectContaining({ code: 'invalid-theme-scope-id', nodeId: 'child' }),
    );
  });
});

describe('atomic Design System Pack mutation', () => {
  function mutationFor(
    session: ReturnType<typeof createUiAuthoringSession>,
  ): DesignSystemPackChangeMutation {
    const sourceDocument = projectUiDesignSystemDocument(session.document).document!;
    return {
      requestId: 'pack-change-1',
      registryRevision: 7,
      documentId: sourceDocument.documentId,
      baseRevision: sourceDocument.revision,
      sourceDocument,
      targetState: {
        pack: targetRef,
        theme: { pack: targetRef, themeId: 'bright' },
        scopes: {
          panel: {
            theme: { pack: targetRef, themeId: 'dim' },
            tokenOverrides: {
              'color.new': { kind: 'resource', resourceId: 'image.new' },
            },
          },
        },
      },
      components: [
        {
          nodeId: 'root',
          source: { id: 'layout.column', version: '1.0.0' },
          target: { id: 'layout.stack', version: '2.0.0' },
        },
        {
          nodeId: 'child',
          source: { id: 'content.text', version: '1.0.0' },
          target: { id: 'content.label', version: '2.0.0' },
        },
      ],
      tokens: [
        { sourceId: 'color.old', targetId: 'color.new' },
        { sourceId: 'space.old', targetId: 'space.new' },
      ],
      resources: [{ sourceId: 'image.old', targetId: 'image.new' }],
    };
  }

  it('applies one revision/history transaction and supports exact undo/redo', () => {
    const before = createUiAuthoringSession(createDocument(), ['child']);
    const mutation = mutationFor(before);
    const result = applyUiDesignSystemPackChange(before, mutation, 7);

    expect(result.diagnostics).toEqual([]);
    expect(result.changed).toBe(true);
    expect(result.state.document.revision).toBe(1);
    expect(result.state.document.designSystem).toEqual(mutation.targetState);
    expect(result.state.past).toHaveLength(1);
    expect(result.state.future).toEqual([]);
    expect(result.state.past[0]?.transaction.command).toMatchObject({
      type: 'apply-design-system-pack-change',
      commandId: 'pack-change-1',
    });
    expect(readUiDocumentNodeAuthoring(result.state.document.root)).toMatchObject({
      component: { id: 'layout.stack', version: '2.0.0' },
      properties: {
        color: { kind: 'token', tokenId: 'color.new' },
        binding: { kind: 'binding', bindingId: 'profile.name' },
        expression: { kind: 'expression', expressionId: 'format.name' },
      },
      layout: { values: { gap: { kind: 'token', tokenId: 'space.new' } } },
    });
    expect(
      readUiDocumentNodeAuthoring((result.state.document.root.children as GenericWidget[])[0]!),
    ).toMatchObject({
      component: { id: 'content.label', version: '2.0.0' },
      properties: { icon: { kind: 'resource', resourceId: 'image.new' } },
      themeScopeId: 'panel',
    });

    const undone = undoUiAuthoringSession(result.state)!;
    expect(undone.document.source).toBe(before.document.source);
    expect(undone.selectedNodeIds).toEqual(['child']);
    expect(redoUiAuthoringSession(undone)?.document.source).toBe(result.state.document.source);
  });

  it('clears redo history and rejects a canonical no-op without adding a record', () => {
    const initial = createUiAuthoringSession(createDocument(), ['child']);
    const edited = applyUiAuthoringSessionCommand(initial, {
      type: 'set-property',
      commandId: 'temporary-edit',
      nodeId: 'root',
      propertyId: 'temporary',
      value: { kind: 'literal', value: true },
    }).state;
    const withRedo = undoUiAuthoringSession(edited)!;
    expect(withRedo.future).toHaveLength(1);

    const applied = applyUiDesignSystemPackChange(withRedo, mutationFor(withRedo), 7);
    expect(applied.changed).toBe(true);
    expect(applied.state.future).toEqual([]);
    expect(applied.state.past).toHaveLength(1);

    const sourceDocument = projectUiDesignSystemDocument(initial.document).document!;
    const noOp = applyUiDesignSystemPackChange(
      initial,
      {
        requestId: 'no-op',
        registryRevision: 7,
        documentId: sourceDocument.documentId,
        baseRevision: sourceDocument.revision,
        sourceDocument,
        targetState: sourceDocument.state,
        components: [],
        tokens: [],
        resources: [],
      },
      7,
    );
    expect(noOp.changed).toBe(false);
    expect(noOp.state).toBe(initial);
    expect(noOp.diagnostics[0]?.code).toBe('pack-change-apply-rejected');
  });

  it('rejects stale and accessor mutations without partial state or getter execution', () => {
    const before = createUiAuthoringSession(createDocument());
    const mutation = mutationFor(before);
    const advanced = applyUiAuthoringSessionCommand(before, {
      type: 'set-property',
      commandId: 'advance-document',
      nodeId: 'root',
      propertyId: 'temporary',
      value: { kind: 'literal', value: true },
    }).state;
    const stale = applyUiDesignSystemPackChange(advanced, mutation, 7);
    expect(stale).toMatchObject({ changed: false, state: advanced });
    expect(stale.diagnostics[0]?.code).toBe('pack-change-document-stale');
    const staleRegistry = applyUiDesignSystemPackChange(before, mutation, 8);
    expect(staleRegistry.state).toBe(before);
    expect(staleRegistry.diagnostics[0]?.code).toBe('pack-change-registry-stale');
    const mismatchedComponent = applyUiDesignSystemPackChange(
      before,
      {
        ...mutation,
        components: [
          {
            ...mutation.components[0]!,
            source: { id: 'wrong.component', version: '1.0.0' },
          },
          mutation.components[1]!,
        ],
      },
      7,
    );
    expect(mismatchedComponent.changed).toBe(false);
    expect(mismatchedComponent.state).toBe(before);
    expect(mismatchedComponent.diagnostics[0]?.code).toBe('pack-change-apply-rejected');

    let getterCalled = false;
    const accessor = { ...mutation } as Record<string, unknown>;
    Object.defineProperty(accessor, 'requestId', {
      enumerable: true,
      get() {
        getterCalled = true;
        return 'unsafe';
      },
    });
    const rejected = applyUiDesignSystemPackChange(before, accessor as never, 7);
    expect(rejected).toMatchObject({ changed: false, state: before });
    expect(rejected.diagnostics[0]?.code).toBe('invalid-pack-change-mutation');
    const accessorDocument = { ...before.document } as Record<string, unknown>;
    Object.defineProperty(accessorDocument, 'designSystem', {
      enumerable: true,
      get() {
        getterCalled = true;
        return before.document.designSystem;
      },
    });
    expect(projectUiDesignSystemDocument(accessorDocument as never).diagnostics[0]?.code).toBe(
      'invalid-pack-change-request',
    );
    const accessorState = { ...before } as Record<string, unknown>;
    Object.defineProperty(accessorState, 'document', {
      enumerable: true,
      get() {
        getterCalled = true;
        return before.document;
      },
    });
    const rejectedState = applyUiDesignSystemPackChange(accessorState as never, mutation, 7);
    expect(rejectedState.changed).toBe(false);
    expect(rejectedState.state).toBe(accessorState);
    expect(rejectedState.diagnostics[0]?.code).toBe('invalid-pack-change-mutation');
    expect(getterCalled).toBe(false);
  });
});
