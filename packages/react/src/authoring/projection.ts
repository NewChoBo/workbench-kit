import type { UiAuthoringDocumentProjection } from '@workbench-kit/jdw';
import type { UiAuthoringDocumentProjectionV3 } from '@workbench-kit/jdw';
import { snapshotUiDesignSystemState } from '@workbench-kit/contracts';
import type {
  UiAuthoringResolutionProjection,
  UiDesignSystemAuthoringChoiceProjection,
} from '@workbench-kit/workbench-core/design-system';

import type { WorkbenchAuthoringProjection, WorkbenchAuthoringProjectionV3 } from './types.js';

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

export function composeWorkbenchAuthoringProjectionV3(
  resolution: UiAuthoringResolutionProjection,
  document: UiAuthoringDocumentProjectionV3,
  designSystemChoices?: UiDesignSystemAuthoringChoiceProjection,
): WorkbenchAuthoringProjectionV3 {
  if (resolution.documentId !== document.documentId) {
    throw new TypeError('Workbench authoring projections must reference the same document.');
  }
  if (resolution.documentRevision !== document.documentRevision) {
    throw new TypeError(
      'Workbench authoring projections must reference the same document revision.',
    );
  }
  if (resolution.hostWidth !== document.previewHostWidth) {
    throw new TypeError(
      'Workbench authoring projections must reference the same preview host width.',
    );
  }
  if (resolution.activeResponsiveVariantId !== document.activeResponsiveVariantId) {
    throw new TypeError('Workbench authoring projections must reference the same active variant.');
  }
  if (document.designSystem === null && designSystemChoices !== undefined) {
    throw new TypeError('A document without Design System state cannot join choice projections.');
  }
  if (document.designSystem !== null && designSystemChoices === undefined) {
    throw new TypeError('A document with Design System state requires an exact choice projection.');
  }
  if (
    designSystemChoices !== undefined &&
    resolution.registryRevision !== designSystemChoices.registryRevision
  ) {
    throw new TypeError(
      'Workbench authoring projections must reference the same registry revision.',
    );
  }
  if (
    document.designSystem !== null &&
    designSystemChoices !== undefined &&
    stableJson(snapshotUiDesignSystemState(document.designSystem)) !==
      stableJson(snapshotUiDesignSystemState(designSystemChoices.state))
  ) {
    throw new TypeError(
      'Workbench authoring projections must reference the same Design System state.',
    );
  }

  return Object.freeze({
    resolution,
    document,
    ...(designSystemChoices === undefined ? {} : { designSystemChoices }),
  });
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Readonly<Record<string, unknown>>).sort(
      ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0),
    );
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}
