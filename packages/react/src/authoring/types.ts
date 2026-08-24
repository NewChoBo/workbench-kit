import type { DesignSystemPackChangeMutation } from '@workbench-kit/contracts';
import type { UiDocumentCommandV2, UiAuthoringDocumentProjection } from '@workbench-kit/jdw';
import type { UiAuthoringResolutionProjection } from '@workbench-kit/workbench-core/design-system';

export interface WorkbenchAuthoringProjection {
  readonly resolution: UiAuthoringResolutionProjection;
  readonly document: UiAuthoringDocumentProjection;
}

export type UiAuthoringSurfaceAction =
  | { readonly kind: 'document-command-v2'; readonly command: UiDocumentCommandV2 }
  | {
      readonly kind: 'design-system-change';
      readonly mutation: DesignSystemPackChangeMutation;
    };

export interface WorkbenchAuthoringController {
  readonly projection: WorkbenchAuthoringProjection;
  readonly dispatch: (action: UiAuthoringSurfaceAction) => void;
}

export interface WorkbenchAuthoringSurfaceProps {
  readonly controller: WorkbenchAuthoringController;
  readonly readOnly?: boolean;
}
