/**
 * Slim Field Remap embed surface for `@workbench-kit/shell-react/field-remap`.
 *
 * Does not re-export workbench shell / extension-host assembly APIs.
 * Import CSS via `@workbench-kit/shell-react/field-remap/view.css` for Flow-only embeds
 * (Flow also side-imports the same stylesheet).
 */

export { FieldRemapPanel, type FieldRemapPanelProps } from './panel.js';
export {
  FieldRemapFlowMapper,
  type FieldRemapFlowActions,
  type FieldRemapFlowMapperProps,
} from './flow.js';
export { FieldRemapDetailPanel, type FieldRemapDetailPanelProps } from './detail-panel.js';
export { FieldRemapConvertPalette, type FieldRemapConvertPaletteProps } from './convert-palette.js';
export { ConvertNoteEditor, type ConvertNoteEditorProps } from './convert-note-editor.js';
export {
  FieldRemapShapeIoEditor,
  ingestSourceShape,
  ingestTargetShape,
  type FieldRemapShapeIoEditorProps,
  type FieldRemapShapeRole,
} from './shape-io-editor.js';
export {
  TransformOptionsEditor,
  type TransformOptionsEditorProps,
} from './transform-options-editor.js';
export {
  DEFAULT_JSONATA_MAX_EXPRESSION_LENGTH,
  DEFAULT_JSONATA_TIMEOUT_MS,
  JSONATA_TRANSFORM_ID,
  JsonataTransformTimeoutError,
  createJsonataValueTransform,
  jsonataValueTransform,
  type CreateJsonataValueTransformOptions,
  type JsonataTransformErrorPolicy,
} from './jsonata-transform.js';
export {
  addTransformStepToEdge,
  bindDraftSource,
  bindDraftTarget,
  bindOperatorInput,
  bindOperatorOutput,
  canEditListContext,
  createCombineOperator,
  createDraftTransform,
  createSplitOperator,
  edgePortTypes,
  enableListContextOnEdge,
  finalizeDraftTransform,
  listCompatibleTransforms,
  removeItemEdgeFromParent,
  removeMappingOperator,
  removeOperatorInput,
  removeOperatorOutput,
  removeTransformStepFromEdge,
  replaceTransformStepOptionsOnEdge,
  setItemEdgesOnEdge,
  setTransformStepIdOnEdge,
  updateMappingEdge,
  updateMappingOperator,
  upsertItemEdgeOnParent,
  type FieldRemapDraftTransform,
  type FieldRemapSelection,
} from './flow-ops.js';
export {
  FIELD_REMAP_SAMPLES,
  getFieldRemapSample,
  isFieldRemapSampleId,
  resolveFieldRemapSampleId,
  type FieldRemapSampleDefinition,
  type FieldRemapSampleId,
} from './samples.js';
