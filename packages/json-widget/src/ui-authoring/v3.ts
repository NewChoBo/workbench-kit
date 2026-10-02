export type { GenericWidget } from '../widget/tree.js';
export { collectWidgetNodes, getWidgetChildren } from '../widget/tree.js';
export { formatWidgetDocumentJson } from '../document/document.js';

export type {
  UiAuthoringSessionStateV3,
  UiDocumentAtomicCommandV3,
  UiDocumentCommandV3,
  UiDocumentCommandV3Context,
  UiDocumentNode,
  UiDocumentNodeV3,
  UiCompositionDefinition,
  UiCompositionParameter,
  UiDocumentV3,
} from './types.js';
export {
  createUiDocumentV3,
  formatUiDocumentV3,
  readUiDocumentNodeAuthoringV3,
} from './document-v3.js';
export {
  createUiAuthoringSessionV3,
  redoUiAuthoringSessionV3,
  selectUiDocumentNodesV3,
  undoUiAuthoringSessionV3,
} from './session-v3.js';
export {
  admitUiDocumentCommandV3,
  applyAdmittedUiAuthoringSessionCommandV3,
  UI_DOCUMENT_COMMAND_V3_ADMISSION_DIAGNOSTIC_CODES,
  validateUiDocumentV3AgainstContext,
} from './semantic-admission-v3.js';
export type {
  UiAuthoringSessionV3AdmissionResult,
  UiDocumentCommandV3AdmissionContext,
  UiDocumentCommandV3AdmissionDiagnostic,
  UiDocumentCommandV3AdmissionDiagnosticCode,
  UiDocumentCommandV3AdmissionResult,
  UiDocumentLiteralPolicy,
  UiDocumentLiteralPolicyInput,
} from './semantic-admission-v3.js';

export {
  uiCompositionComponentRef,
  describeUiCompositionDefinition,
  resolveUiCompositionInstances,
} from './composition.js';
export type {
  UiCompositionScalar,
  UiCompositionDefinitionSource,
  UiCompositionDependency,
  UiCompositionParameterDescriptor,
  UiCompositionDiagnosticCode,
  UiCompositionDiagnostic,
  UiCompositionDefinitionDescription,
  UiCompositionNodeProvenance,
  UiCompositionResolution,
} from './composition.js';
