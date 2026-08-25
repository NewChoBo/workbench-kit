import type { DesignSystemPackChangeMutation } from '@workbench-kit/contracts';
import type {
  UiAuthoringDocumentProjection,
  UiAuthoringDocumentProjectionV3,
  UiDocumentCommandV2,
  UiDocumentCommandV3,
  UiResponsiveEditingTarget,
} from '@workbench-kit/jdw';
import type {
  UiAuthoringResolutionProjection,
  UiDesignSystemAuthoringChoiceProjection,
} from '@workbench-kit/workbench-core/design-system';

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

export interface WorkbenchAuthoringProjectionV3 {
  readonly resolution: UiAuthoringResolutionProjection;
  readonly document: UiAuthoringDocumentProjectionV3;
  readonly designSystemChoices?: UiDesignSystemAuthoringChoiceProjection;
}

export type UiAuthoringSurfaceActionV3 =
  | { readonly kind: 'document-command-v3'; readonly command: UiDocumentCommandV3 }
  | {
      readonly kind: 'design-system-change';
      readonly mutation: DesignSystemPackChangeMutation;
    };

/**
 * Host-owned adapter for the V3 authoring surfaces. Preview width and editing
 * target are transient view operands and deliberately bypass document history.
 */
export interface WorkbenchAuthoringControllerV3 {
  readonly projection: WorkbenchAuthoringProjectionV3;
  readonly dispatch: (action: UiAuthoringSurfaceActionV3) => void;
  readonly setPreviewHostWidth: (width: number) => void;
  readonly setEditingTarget: (target: UiResponsiveEditingTarget) => void;
}

export interface WorkbenchAuthoringSurfacePropsV3 {
  readonly controller: WorkbenchAuthoringControllerV3;
  readonly readOnly?: boolean;
}
