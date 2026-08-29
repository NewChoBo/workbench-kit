export {
  composeWorkbenchAuthoringProjection,
  composeWorkbenchAuthoringProjectionV3,
} from './projection.js';
export {
  createWorkbenchAuthoringCommandId,
  createWorkbenchAuthoringCanvasPlacementActionV3,
  createWorkbenchAuthoringLayoutActionV3,
  createWorkbenchAuthoringPropertyActionV3,
} from './actions.js';
export type {
  WorkbenchAuthoringCommandIdInput,
  WorkbenchAuthoringCanvasPlacementActionInput,
  WorkbenchAuthoringLayoutActionInput,
  WorkbenchCanvasPlacementResizeEdge,
  WorkbenchCanvasPlacementTransform,
  WorkbenchAuthoringPropertyActionInput,
} from './actions.js';
export { WorkbenchAuthoringCanvas } from './WorkbenchAuthoringCanvas.js';
export { WorkbenchAuthoringInspector } from './WorkbenchAuthoringInspector.js';
export type {
  UiAuthoringSurfaceAction,
  UiAuthoringSurfaceActionV3,
  WorkbenchAuthoringController,
  WorkbenchAuthoringControllerV3,
  WorkbenchAuthoringProjection,
  WorkbenchAuthoringProjectionV3,
  WorkbenchAuthoringSurfaceProps,
  WorkbenchAuthoringSurfacePropsV3,
} from './types.js';
