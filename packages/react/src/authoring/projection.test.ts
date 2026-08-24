import { describe, expect, it } from 'vitest';

import type { UiAuthoringDocumentProjection } from '@workbench-kit/jdw';
import type { UiAuthoringResolutionProjection } from '@workbench-kit/workbench-core/design-system';

import {
  composeWorkbenchAuthoringProjection,
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
