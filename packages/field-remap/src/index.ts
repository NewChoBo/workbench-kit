export type {
  ClassRef,
  CombineMappingOperator,
  FieldDataType,
  MappingEdge,
  MappingOperator,
  FieldRemapDocument,
  SourceField,
  SplitMappingOperator,
  TargetSlot,
  TransformContext,
  TransformOptionField,
  ValueTransformDefinition,
  ValueTransformListFilter,
  ValueTransformRegistry,
} from './domain/types.js';

export {
  canonicalizeTransformId,
  IDENTITY_TRANSFORM_ID,
  MAX_TRANSFORM_CHAIN,
  TRANSFORM_ID_ALIASES,
} from './domain/constants.js';

export {
  createMappingEdge,
  edgeItemTransformIds,
  edgeTransformIds,
  normalizeMappingEdge,
  normalizeMappingEdges,
} from './domain/document/mappingEdge.js';

export {
  createFieldRemapDocument,
  deserializeFieldRemapDocument,
  InvalidFieldRemapDocumentError,
  migrateFieldRemapDocument,
  normalizeFieldRemapDocument,
  parseFieldRemapDocument,
  FIELD_REMAP_DOCUMENT_VERSION,
  FIELD_REMAP_DOCUMENT_V1_VERSION,
  serializeFieldRemapDocument,
  UnsupportedFieldRemapDocumentVersionError,
} from './domain/document/fieldRemapDocument.js';
export type { CreateFieldRemapDocumentOptions } from './domain/document/fieldRemapDocument.js';

export {
  InvalidObjectPathError,
  isSafeObjectPath,
  objectPathHasWildcard,
  parseObjectPath,
  UnsafeObjectPathError,
} from './domain/mapping/objectPathSafety.js';
export type { ObjectPathSegment } from './domain/mapping/objectPathSafety.js';
export {
  applyStringTemplate,
  DEFAULT_MAX_PATH_WILDCARD_EXPANSION,
  isPlainObject,
  listArrayItemProjectionOptions,
  PathExpansionLimitError,
  projectCollectionItems,
  projectObjectPath,
  readObjectPath,
  writeObjectPath,
} from './domain/mapping/pathUtils.js';
export type {
  ArrayItemProjectionOption,
  ProjectObjectPathOptions,
} from './domain/mapping/pathUtils.js';

export {
  formatDateParts,
  parseDateParts,
  reformatDateString,
  splitDateTimeString,
} from './domain/mapping/dateFormat.js';
export type { DateParts } from './domain/mapping/dateFormat.js';

export { convertArrayWithItemEdges } from './domain/mapping/convertItemEdges.js';
export { findParentChildMappingConflicts } from './domain/mapping/mappingConflicts.js';
export type { MappingConflict } from './domain/mapping/mappingConflicts.js';

export {
  MAX_MAPPING_FAN_IN,
  MAX_MAPPING_FAN_OUT,
  MappingOperatorError,
  applyMappingOperators,
  normalizeMappingOperators,
} from './domain/mapping/mappingOperators.js';
export type {
  ApplyMappingOperatorsInput,
  ApplyMappingOperatorsResult,
} from './domain/mapping/mappingOperators.js';

export {
  optionFieldsForStep,
  resolveOptionSteps,
  resizeOptionSteps,
  sanitizeOptionRecord,
  sanitizeOptionSteps,
} from './domain/mapping/transformOptions.js';

export {
  findSourceField,
  findTargetSlot,
  flattenSourceFields,
  flattenTargetSlots,
  resolveAllEdgePreviews,
  resolveEdgePreview,
  resolveMappedValue,
} from './domain/mapping/resolveMappedValue.js';

export {
  attachShapeIdToSourceFields,
  createDataShapeRegistry,
  defineDataShape,
  mergeSourceShapes,
  targetSlotsFromShape,
} from './domain/shapes/dataShape.js';
export type { DataShape, DataShapeRegistry, DataShapeRole } from './domain/shapes/dataShape.js';

export {
  FIELD_DATA_TYPES,
  collectSourceFieldIds,
  collectTargetSlotIds,
  isFieldDataType,
  pruneMappingEdgesForShapes,
  setSourceFieldDataType,
  setTargetSlotDataType,
} from './domain/shapes/shapeEdit.js';

export {
  projectShapes,
  projectSourceFields,
  projectTargetSlots,
} from './domain/shapes/projectShapes.js';
export type {
  ProjectShapesInput,
  ProjectShapesOptions,
  ProjectShapesResult,
} from './domain/shapes/projectShapes.js';

export {
  createConversionRegistry,
  defineConversion,
  withConversionEdges,
} from './domain/shapes/conversionDefinition.js';
export type {
  ConversionDefinition,
  ConversionRegistry,
  DefineConversionInput,
} from './domain/shapes/conversionDefinition.js';

export { convertToShape } from './domain/shapes/convertToShape.js';
export type {
  ConvertToShapeInput,
  ConvertToShapeResult,
  ConvertToShapeSlotResult,
} from './domain/shapes/convertToShape.js';

export { convertMappedInputs } from './domain/shapes/convertMappedInputs.js';
export type { ConvertMappedInputsInput } from './domain/shapes/convertMappedInputs.js';

export { createAbortError, isAbortError, throwIfAborted } from './domain/abort.js';

export { sourceFieldsFromPlainObject } from './domain/ingest/sourceFieldsFromPlainObject.js';
export type { SourceFieldsFromPlainObjectOptions } from './domain/ingest/sourceFieldsFromPlainObject.js';

export { targetSlotsFromPlainObject } from './domain/ingest/targetSlotsFromPlainObject.js';
export type { TargetSlotsFromPlainObjectOptions } from './domain/ingest/targetSlotsFromPlainObject.js';

export {
  applyTransformChain,
  areFieldTypesCompatible,
  arePortsCompatible,
  createValueTransformRegistry,
  isTransformChainCompatible,
  isTransformCompatible,
} from './registry/createValueTransformRegistry.js';
export type { ArePortsCompatibleInput } from './registry/createValueTransformRegistry.js';

export {
  ARRAY_REDUCE_TRANSFORM_IDS,
  BUILTIN_TRANSFORM_IDS,
  STRING_FORMAT_TRANSFORM_IDS,
  builtinValueTransforms,
  createBuiltinValueTransformRegistry,
} from './registry/builtinTransforms.js';
export type { CreateBuiltinValueTransformRegistryOptions } from './registry/builtinTransforms.js';
