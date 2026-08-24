import type { UiAuthoringDocumentProjection } from '@workbench-kit/jdw';
import type { UiAuthoringResolutionProjection } from '@workbench-kit/workbench-core/design-system';

import type { WorkbenchAuthoringProjection } from './types.js';

export function composeWorkbenchAuthoringProjection(
  resolution: UiAuthoringResolutionProjection,
  document: UiAuthoringDocumentProjection,
): WorkbenchAuthoringProjection {
  if (resolution.documentId !== document.documentId) {
    throw new TypeError('Workbench authoring projections must have the same document id.');
  }
  if (resolution.documentRevision !== document.documentRevision) {
    throw new TypeError('Workbench authoring projections must have the same document revision.');
  }

  return Object.freeze({ resolution, document });
}
