import { describe, expect, it } from 'vitest';

import type { UiAuthoringDocumentProjection } from '@workbench-kit/jdw';
import type { UiAuthoringDocumentProjectionV3 } from '@workbench-kit/jdw';
import type { UiAuthoringResolutionProjection } from '@workbench-kit/workbench-core/design-system';
import type { UiDesignSystemAuthoringChoiceProjection } from '@workbench-kit/workbench-core/design-system';

import {
  composeWorkbenchAuthoringProjection,
  composeWorkbenchAuthoringProjectionV3,
  type UiAuthoringSurfaceAction,
  type WorkbenchAuthoringController,
  type WorkbenchAuthoringSurfaceProps,
} from './index.js';

function resolution(
  documentId = 'document-1',
  documentRevision = 3,
): UiAuthoringResolutionProjection {
  return {
    documentId,
    documentRevision,
    registryRevision: 7,
    nodes: [],
    diagnostics: [],
  };
}

function document(documentId = 'document-1', documentRevision = 3): UiAuthoringDocumentProjection {
  return {
    documentId,
    documentRevision,
    nodes: [],
    issues: [],
  };
}

describe('composeWorkbenchAuthoringProjection', () => {
  it('returns a shallow frozen join without copying either headless projection', () => {
    const resolutionProjection = resolution();
    const documentProjection = document();

    const joined = composeWorkbenchAuthoringProjection(resolutionProjection, documentProjection);

    expect(joined).toEqual({ resolution: resolutionProjection, document: documentProjection });
    expect(joined.resolution).toBe(resolutionProjection);
    expect(joined.document).toBe(documentProjection);
    expect(Object.isFrozen(joined)).toBe(true);
    expect(Object.isFrozen(resolutionProjection)).toBe(false);
    expect(Object.isFrozen(documentProjection)).toBe(false);
  });

  it('rejects projections from different documents', () => {
    expect(() =>
      composeWorkbenchAuthoringProjection(resolution('first'), document('second')),
    ).toThrow(TypeError);
  });

  it('rejects projections from different document revisions', () => {
    expect(() =>
      composeWorkbenchAuthoringProjection(resolution('document-1', 2), document()),
    ).toThrow(TypeError);
  });

  it('keeps dispatch ownership in the host controller contract', () => {
    const actions: UiAuthoringSurfaceAction[] = [];
    const controller: WorkbenchAuthoringController = {
      projection: composeWorkbenchAuthoringProjection(resolution(), document()),
      dispatch: (action) => actions.push(action),
    };
    const props: WorkbenchAuthoringSurfaceProps = { controller, readOnly: true };

    props.controller.dispatch({
      kind: 'document-command-v2',
      command: {
        type: 'clear-input-binding',
        commandId: 'clear-profile',
        nodeId: 'profile-card',
        inputId: 'profile',
      },
    });

    expect(actions).toEqual([
      {
        kind: 'document-command-v2',
        command: {
          type: 'clear-input-binding',
          commandId: 'clear-profile',
          nodeId: 'profile-card',
          inputId: 'profile',
        },
      },
    ]);
  });
});

describe('composeWorkbenchAuthoringProjectionV3', () => {
  const documentV3 = (): UiAuthoringDocumentProjectionV3 => ({
    documentId: 'document-1',
    documentRevision: 3,
    previewHostWidth: 840,
    editingTarget: { kind: 'base' },
    responsiveVariants: [],
    designSystem: {
      pack: { id: 'neutral', version: '1.0.0' },
      theme: { pack: { id: 'neutral', version: '1.0.0' }, themeId: 'dark' },
    },
    nodes: [],
    issues: [],
  });
  const choices = (): UiDesignSystemAuthoringChoiceProjection => ({
    registryRevision: 7,
    state: {
      pack: { id: 'neutral', version: '1.0.0' },
      theme: { pack: { id: 'neutral', version: '1.0.0' }, themeId: 'dark' },
    },
    packs: [],
    diagnostics: [],
  });

  it('joins the exact document, preview width, and registry revision', () => {
    const resolutionProjection = { ...resolution(), hostWidth: 840 };
    const documentProjection = documentV3();
    const choiceProjection = choices();
    const joined = composeWorkbenchAuthoringProjectionV3(
      resolutionProjection,
      documentProjection,
      choiceProjection,
    );

    expect(joined).toEqual({
      resolution: resolutionProjection,
      document: documentProjection,
      designSystemChoices: choiceProjection,
    });
    expect(Object.isFrozen(joined)).toBe(true);
  });

  it('rejects mismatched preview and registry operands', () => {
    expect(() =>
      composeWorkbenchAuthoringProjectionV3(
        { ...resolution(), hostWidth: 640 },
        documentV3(),
        choices(),
      ),
    ).toThrow(/preview host width/);
    expect(() =>
      composeWorkbenchAuthoringProjectionV3({ ...resolution(), hostWidth: 840 }, documentV3(), {
        ...choices(),
        registryRevision: 8,
      }),
    ).toThrow(/registry revision/);
    expect(() =>
      composeWorkbenchAuthoringProjectionV3(
        { ...resolution(), hostWidth: 840, activeResponsiveVariantId: 'narrow' },
        documentV3(),
        choices(),
      ),
    ).toThrow(/active variant/);
    expect(() =>
      composeWorkbenchAuthoringProjectionV3({ ...resolution(), hostWidth: 840 }, documentV3(), {
        ...choices(),
        state: {
          pack: { id: 'neutral', version: '1.0.0' },
          theme: { pack: { id: 'neutral', version: '1.0.0' }, themeId: 'light' },
        },
      }),
    ).toThrow(/Design System state/);
  });

  it('does not join a choice projection when the document has no Design System state', () => {
    const documentWithoutDesignSystem = { ...documentV3(), designSystem: null };
    const joined = composeWorkbenchAuthoringProjectionV3(
      { ...resolution(), hostWidth: 840 },
      documentWithoutDesignSystem,
    );

    expect(joined.designSystemChoices).toBeUndefined();
    expect(() =>
      composeWorkbenchAuthoringProjectionV3(
        { ...resolution(), hostWidth: 840 },
        documentWithoutDesignSystem,
        choices(),
      ),
    ).toThrow(/without Design System state/);
  });
});
