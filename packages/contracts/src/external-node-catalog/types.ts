import type {
  NodeTypeCatalogContribution,
  NodeTypeDesignTimeMetadata,
  NodeTypeRef,
} from '../graph-authoring/types';
import type { NodeTypeValidationIssue } from '../graph-authoring/validation';
import type { UiValueSchema } from '../ui-authoring/types';

export const EXTERNAL_NODE_CATALOG_PROJECTION_SCHEMA_VERSION = 1 as const;

export const EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS = Object.freeze({
  maxEntries: 512,
  maxPortsPerEntry: 256,
  maxMappings: 2_048,
  maxPortableDepth: 32,
  maxPortableProperties: 32_768,
  maxStringLength: 4_096,
} as const);

export interface ExternalNodeFixedInputSnapshot {
  readonly kind: 'fixed';
  readonly id: string;
  readonly label?: string;
  readonly description?: string;
  readonly required?: boolean;
  readonly valueSemanticId: string;
}

export interface ExternalNodeDynamicInputSnapshot {
  readonly kind: 'dynamic';
  readonly id: string;
  readonly label?: string;
  readonly description?: string;
}

export type ExternalNodeInputSnapshot =
  ExternalNodeFixedInputSnapshot | ExternalNodeDynamicInputSnapshot;

export interface ExternalNodeFixedOutputSnapshot {
  readonly kind: 'fixed';
  readonly id: string;
  readonly label?: string;
  readonly description?: string;
  readonly valueSemanticId: string;
}

export interface ExternalNodeDynamicOutputSnapshot {
  readonly kind: 'dynamic';
  readonly id: string;
  readonly label?: string;
  readonly description?: string;
}

export type ExternalNodeOutputSnapshot =
  ExternalNodeFixedOutputSnapshot | ExternalNodeDynamicOutputSnapshot;

export interface ExternalStaticNodeCatalogEntry {
  readonly kind: 'static';
  readonly sourceTypeKey: string;
  readonly inputs: readonly ExternalNodeInputSnapshot[];
  readonly outputs: readonly ExternalNodeOutputSnapshot[];
  readonly designTime: NodeTypeDesignTimeMetadata;
}

export interface ExternalDynamicNodeCatalogEntry {
  readonly kind: 'dynamic';
  readonly sourceTypeKey: string;
  readonly designTime: Pick<NodeTypeDesignTimeMetadata, 'label' | 'description' | 'category'>;
}

export type ExternalNodeCatalogEntry =
  ExternalStaticNodeCatalogEntry | ExternalDynamicNodeCatalogEntry;

export interface ExternalNodeCatalogSnapshot {
  readonly schemaVersion: 1;
  readonly entries: readonly ExternalNodeCatalogEntry[];
}

export interface ExternalNodeIdentityMapping {
  readonly sourceTypeKey: string;
  readonly target: NodeTypeRef;
}

export interface ExternalNodeValueSemanticMapping {
  readonly sourceSemanticId: string;
  readonly target: UiValueSchema;
}

export interface ExternalNodeCatalogProjectionMapping {
  readonly schemaVersion: 1;
  readonly contributorId: string;
  readonly identities: readonly ExternalNodeIdentityMapping[];
  readonly values: readonly ExternalNodeValueSemanticMapping[];
}

export const EXTERNAL_NODE_CATALOG_PROJECTION_ISSUE_CODES = Object.freeze([
  'unsupported-schema-version',
  'invalid-foreign-snapshot',
  'invalid-foreign-entry',
  'invalid-projection-mapping',
  'admission-limit-exceeded',
  'duplicate-source-type-key',
  'duplicate-identity-mapping',
  'missing-identity-mapping',
  'duplicate-value-semantic-mapping',
  'missing-value-semantic-mapping',
  'duplicate-projected-node-ref',
  'unsupported-foreign-input',
  'unsupported-foreign-output',
  'unsupported-dynamic-shape',
  'unsafe-foreign-entry',
  'projected-descriptor-invalid',
] as const);

export type ExternalNodeCatalogProjectionIssueCode =
  (typeof EXTERNAL_NODE_CATALOG_PROJECTION_ISSUE_CODES)[number];

interface ExternalNodeCatalogProjectionIssueBase {
  readonly message: string;
  readonly path: string;
}

type ExternalNodeCatalogProjectionUnsupportedVersionIssue =
  ExternalNodeCatalogProjectionIssueBase & {
    readonly code: 'unsupported-schema-version';
    readonly sourceIndex?: never;
    readonly sourceTypeKey?: never;
    readonly mappingIndex?: never;
    readonly nodeIssue?: never;
  };

type ExternalNodeCatalogProjectionInvalidAttemptIssue =
  | (ExternalNodeCatalogProjectionIssueBase & {
      readonly code: 'invalid-foreign-snapshot' | 'admission-limit-exceeded';
      readonly sourceIndex?: never;
      readonly sourceTypeKey?: never;
      readonly mappingIndex?: never;
      readonly nodeIssue?: never;
    })
  | (ExternalNodeCatalogProjectionIssueBase & {
      readonly code: 'invalid-projection-mapping';
      readonly sourceIndex?: never;
      readonly sourceTypeKey?: never;
      readonly mappingIndex?: never;
      readonly nodeIssue?: never;
    });

type ExternalNodeCatalogProjectionMappingIssue = ExternalNodeCatalogProjectionIssueBase & {
  readonly code:
    | 'invalid-projection-mapping'
    | 'duplicate-identity-mapping'
    | 'duplicate-value-semantic-mapping';
  readonly sourceIndex?: never;
  readonly sourceTypeKey?: never;
  readonly mappingIndex: number;
  readonly nodeIssue?: never;
};

type ExternalNodeCatalogProjectionUnkeyedSourceIssue = ExternalNodeCatalogProjectionIssueBase & {
  readonly code: 'invalid-foreign-entry' | 'unsafe-foreign-entry';
  readonly sourceIndex: number;
  readonly sourceTypeKey?: never;
  readonly mappingIndex?: never;
  readonly nodeIssue?: never;
};

type ExternalNodeCatalogProjectionKeyedSourceIssue = ExternalNodeCatalogProjectionIssueBase & {
  readonly code:
    | 'duplicate-source-type-key'
    | 'missing-identity-mapping'
    | 'missing-value-semantic-mapping'
    | 'duplicate-projected-node-ref'
    | 'unsupported-foreign-input'
    | 'unsupported-foreign-output'
    | 'unsupported-dynamic-shape';
  readonly sourceIndex: number;
  readonly sourceTypeKey: string;
  readonly mappingIndex?: never;
  readonly nodeIssue?: never;
};

type ExternalNodeCatalogProjectionDescriptorIssue = ExternalNodeCatalogProjectionIssueBase & {
  readonly code: 'projected-descriptor-invalid';
  readonly sourceIndex: number;
  readonly sourceTypeKey: string;
  readonly mappingIndex?: never;
  readonly nodeIssue: NodeTypeValidationIssue;
};

type ExternalNodeCatalogProjectionRowIssue =
  | ExternalNodeCatalogProjectionMappingIssue
  | ExternalNodeCatalogProjectionUnkeyedSourceIssue
  | ExternalNodeCatalogProjectionKeyedSourceIssue
  | ExternalNodeCatalogProjectionDescriptorIssue;

export type ExternalNodeCatalogProjectionIssue =
  | ExternalNodeCatalogProjectionUnsupportedVersionIssue
  | ExternalNodeCatalogProjectionInvalidAttemptIssue
  | ExternalNodeCatalogProjectionRowIssue;

export interface ExternalNodeCatalogProjectionAcceptance {
  readonly sourceIndex: number;
  readonly sourceTypeKey: string;
  readonly target: NodeTypeRef;
}

export type ExternalNodeCatalogProjectionAcceptances = readonly [
  ExternalNodeCatalogProjectionAcceptance,
  ...ExternalNodeCatalogProjectionAcceptance[],
];

export type ExternalNodeCatalogProjectionIssues = readonly [
  ExternalNodeCatalogProjectionIssue,
  ...ExternalNodeCatalogProjectionIssue[],
];

type ExternalNodeCatalogProjectionRowIssues = readonly [
  ExternalNodeCatalogProjectionRowIssue,
  ...ExternalNodeCatalogProjectionRowIssue[],
];

export type ExternalNodeCatalogProjectionResult =
  | {
      readonly status: 'complete';
      readonly contribution: NodeTypeCatalogContribution;
      readonly accepted: readonly ExternalNodeCatalogProjectionAcceptance[];
      readonly issues: readonly [];
    }
  | {
      readonly status: 'partial';
      readonly contribution: NodeTypeCatalogContribution;
      readonly accepted: ExternalNodeCatalogProjectionAcceptances;
      readonly issues: ExternalNodeCatalogProjectionRowIssues;
    }
  | {
      readonly status: 'rejected';
      readonly contribution?: never;
      readonly accepted: readonly [];
      readonly issues: ExternalNodeCatalogProjectionRowIssues;
    }
  | {
      readonly status: 'invalid';
      readonly contribution?: never;
      readonly accepted: readonly [];
      readonly issues: readonly [ExternalNodeCatalogProjectionInvalidAttemptIssue];
    }
  | {
      readonly status: 'unsupported-version';
      readonly contribution?: never;
      readonly accepted: readonly [];
      readonly issues: readonly [ExternalNodeCatalogProjectionUnsupportedVersionIssue];
    };
