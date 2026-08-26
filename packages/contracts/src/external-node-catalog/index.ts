export type {
  ExternalDynamicNodeCatalogEntry,
  ExternalNodeCatalogEntry,
  ExternalNodeCatalogProjectionAcceptance,
  ExternalNodeCatalogProjectionAcceptances,
  ExternalNodeCatalogProjectionIssue,
  ExternalNodeCatalogProjectionIssueCode,
  ExternalNodeCatalogProjectionIssues,
  ExternalNodeCatalogProjectionMapping,
  ExternalNodeCatalogProjectionResult,
  ExternalNodeCatalogSnapshot,
  ExternalNodeDynamicInputSnapshot,
  ExternalNodeDynamicOutputSnapshot,
  ExternalNodeFixedInputSnapshot,
  ExternalNodeFixedOutputSnapshot,
  ExternalNodeIdentityMapping,
  ExternalNodeInputSnapshot,
  ExternalNodeOutputSnapshot,
  ExternalNodeValueSemanticMapping,
  ExternalStaticNodeCatalogEntry,
} from './types';
export {
  EXTERNAL_NODE_CATALOG_PROJECTION_ISSUE_CODES,
  EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS,
  EXTERNAL_NODE_CATALOG_PROJECTION_SCHEMA_VERSION,
} from './types';
export { projectExternalNodeCatalogContribution } from './projection';
