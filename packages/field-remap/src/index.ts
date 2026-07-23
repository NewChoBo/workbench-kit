export type {
  FieldDataType,
  MappingEdge,
  FieldRemapDocument,
  SourceField,
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
  serializeFieldRemapDocument,
  UnsupportedFieldRemapDocumentVersionError,
} from './domain/document/fieldRemapDocument.js';

export {
  applyStringTemplate,
  isPlainObject,
  isSafeObjectPath,
  listArrayItemProjectionOptions,
  projectCollectionItems,
  readObjectPath,
  UnsafeObjectPathError,
  writeObjectPath,
} from './domain/mapping/pathUtils.js';
export type { ArrayItemProjectionOption } from './domain/mapping/pathUtils.js';

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
  collectOptionFields,
  contextWithEdgeOptions,
  mergeOptionSteps,
  optionFieldsForStep,
  patchOptionRecord,
  patchOptionStep,
  resolveOptionSteps,
  resizeOptionSteps,
  sanitizeOptionRecord,
  sanitizeOptionSteps,
  sharedOptionsFromSteps,
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

export { sourceFieldsFromPlainObject } from './domain/ingest/sourceFieldsFromPlainObject.js';
export type { SourceFieldsFromPlainObjectOptions } from './domain/ingest/sourceFieldsFromPlainObject.js';

export { targetSlotsFromPlainObject } from './domain/ingest/targetSlotsFromPlainObject.js';
export type { TargetSlotsFromPlainObjectOptions } from './domain/ingest/targetSlotsFromPlainObject.js';

export {
  applyTransformChain,
  createValueTransformRegistry,
  isTransformChainCompatible,
  isTransformCompatible,
} from './registry/createValueTransformRegistry.js';

export {
  ARRAY_REDUCE_TRANSFORM_IDS,
  BUILTIN_TRANSFORM_IDS,
  DATE_STYLE_TRANSFORM_IDS,
  STRING_FORMAT_TRANSFORM_IDS,
  TIME_FORMAT_TRANSFORM_IDS,
  builtinValueTransforms,
  createBuiltinValueTransformRegistry,
} from './registry/builtinTransforms.js';
export type { CreateBuiltinValueTransformRegistryOptions } from './registry/builtinTransforms.js';
