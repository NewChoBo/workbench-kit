import type {
  DesignSystemContributionProvenance,
  DesignSystemDiagnostic,
  DesignSystemAuthoredDocumentSnapshot,
  DesignSystemPackChangeMutation,
  UiComponentBindingDescriptor,
  UiComponentCatalogContract,
  UiComponentRef,
  UiDesignSystemState,
  UiValueSource,
} from '@workbench-kit/contracts';

import type { WidgetPath } from '../document/path.js';
import type { GenericWidget } from '../widget/tree.js';
import type { WidgetPatch } from '../widget/patch.js';

export const UI_DOCUMENT_AUTHORING_ARG = '$authoring' as const;

export interface UiDocumentNodeAuthoring {
  /** Semantic-root only. Omitted on the root means legacy v0; `1` means v1. */
  readonly documentSchemaVersion?: 1;
  readonly component: UiComponentRef;
  readonly properties: Readonly<Record<string, UiValueSource>>;
  readonly bindings?: Readonly<Record<string, string>>;
  readonly themeScopeId?: string;
  readonly designSystem?: UiDesignSystemState;
  readonly layout?: {
    readonly strategyId: string;
    readonly values: Readonly<Record<string, UiValueSource>>;
  };
}

export type UiDocumentNode = GenericWidget & {
  readonly id: string;
  readonly $authoring: UiDocumentNodeAuthoring;
};

export interface UiDocument {
  readonly documentId: string;
  readonly revision: number;
  readonly source: string;
  readonly root: UiDocumentNode;
  readonly designSystem: UiDesignSystemState | null;
}

export const UI_DOCUMENT_ISSUE_CODES = Object.freeze([
  'blank-document-id',
  'invalid-source',
  'wrapper-authoring-identity',
  'missing-node-id',
  'noncanonical-node-id',
  'duplicate-node-id',
  'invalid-authoring-envelope',
  'invalid-component-ref',
  'invalid-property-value',
  'invalid-layout-strategy',
  'invalid-layout-value',
  'migration-resolution-failed',
  'invalid-design-system-state',
  'nonroot-design-system-state',
  'invalid-theme-scope-id',
  'theme-scope-without-state',
  'theme-scope-not-found',
  'duplicate-active-theme-scope',
  'invalid-input-binding',
  'nonroot-document-schema-version',
  'unsupported-document-schema-version',
  'bindings-require-document-schema-version',
] as const);

export type UiDocumentIssueCode = (typeof UI_DOCUMENT_ISSUE_CODES)[number];

export interface UiDocumentIssue {
  readonly code: UiDocumentIssueCode;
  readonly message: string;
  readonly path: string;
  readonly nodeId?: string;
  readonly propertyId?: string;
  readonly inputId?: string;
}

export interface CreateUiDocumentResult {
  readonly document: UiDocument | null;
  readonly issues: readonly UiDocumentIssue[];
}

export interface UiDocumentHierarchyEntry {
  readonly nodeId: string;
  readonly component: UiComponentRef;
  readonly path: WidgetPath;
  readonly parentNodeId: string | null;
}

export type UiDocumentCommand =
  | {
      readonly type: 'insert-node';
      readonly commandId: string;
      readonly parentId: string;
      readonly index: number;
      readonly node: UiDocumentNode;
    }
  | { readonly type: 'remove-node'; readonly commandId: string; readonly nodeId: string }
  | {
      readonly type: 'replace-node';
      readonly commandId: string;
      readonly nodeId: string;
      readonly node: UiDocumentNode;
    }
  | {
      readonly type: 'move-node';
      readonly commandId: string;
      readonly nodeId: string;
      readonly targetParentId: string;
      readonly index: number;
    }
  | {
      readonly type: 'set-property';
      readonly commandId: string;
      readonly nodeId: string;
      readonly propertyId: string;
      readonly value?: UiValueSource;
    }
  | {
      readonly type: 'set-layout';
      readonly commandId: string;
      readonly nodeId: string;
      readonly strategyId: string;
      readonly values: Readonly<Record<string, UiValueSource>>;
    };

export interface UiDocumentTransaction {
  readonly transactionId: string;
  readonly command: UiDocumentCommand;
  readonly intent?: UiDesignSystemPackChangeCommand;
  readonly baseRevision: number;
  readonly nextRevision: number;
  readonly patches: readonly WidgetPatch[];
}

export interface UiDesignSystemPackChangeCommand {
  readonly type: 'apply-design-system-pack-change';
  readonly commandId: string;
  readonly mutation: DesignSystemPackChangeMutation;
}

export const UI_DOCUMENT_COMMAND_ISSUE_CODES = Object.freeze([
  'blank-command-id',
  'blank-property-id',
  'node-not-found',
  'root-structural-command',
  'replacement-id-mismatch',
  'invalid-command-payload',
  'patch-rejected',
] as const);

export type UiDocumentCommandIssueCode = (typeof UI_DOCUMENT_COMMAND_ISSUE_CODES)[number];

export interface UiDocumentCommandIssue {
  readonly code: UiDocumentCommandIssueCode;
  readonly message: string;
  readonly nodeId?: string;
}

export interface ApplyUiDocumentCommandResult {
  readonly document: UiDocument;
  readonly transaction: UiDocumentTransaction | null;
  readonly issues: readonly (UiDocumentIssue | UiDocumentCommandIssue)[];
  readonly changed: boolean;
}

export interface UiDocumentCommandV2Context {
  readonly componentCatalog: UiComponentCatalogContract;
}

export type UiDocumentAtomicCommandV2 =
  | UiDocumentCommand
  | {
      readonly type: 'set-input-binding';
      readonly commandId: string;
      readonly nodeId: string;
      readonly inputId: string;
      readonly bindingId: string;
    }
  | {
      readonly type: 'clear-input-binding';
      readonly commandId: string;
      readonly nodeId: string;
      readonly inputId: string;
    };

export type UiDocumentCommandV2 =
  | UiDocumentAtomicCommandV2
  | {
      readonly type: 'batch';
      readonly commandId: string;
      readonly commands: readonly UiDocumentAtomicCommandV2[];
    };

export type UiDocumentCommandV2IssueCode =
  | UiDocumentCommandIssueCode
  | 'component-unavailable'
  | 'input-unavailable'
  | 'input-output-only'
  | 'invalid-binding-id'
  | 'duplicate-command-id'
  | 'nested-batch'
  | 'empty-batch'
  | 'operation-failed';

export interface UiDocumentCommandV2Issue {
  readonly code: UiDocumentCommandV2IssueCode;
  readonly message: string;
  readonly commandId?: string;
  readonly nodeId?: string;
  readonly inputId?: string;
}

export interface UiDocumentTransactionV2 {
  readonly transactionId: string;
  readonly command: UiDocumentCommandV2;
  readonly intent?: UiDesignSystemPackChangeCommand;
  readonly baseRevision: number;
  readonly nextRevision: number;
  readonly patches: readonly WidgetPatch[];
}

export interface ApplyUiDocumentCommandV2Result {
  readonly document: UiDocument;
  readonly transaction: UiDocumentTransactionV2 | null;
  readonly issues: readonly (UiDocumentIssue | UiDocumentCommandIssue | UiDocumentCommandV2Issue)[];
  readonly changed: boolean;
}

export interface UiDocumentTransactionRecordV2 {
  readonly transaction: UiDocumentTransactionV2;
  readonly beforeDocument: UiDocument;
  readonly afterDocument: UiDocument;
  readonly beforeSelectedNodeIds: readonly string[];
  readonly afterSelectedNodeIds: readonly string[];
}

export interface UiAuthoringSessionStateV2 {
  readonly document: UiDocument;
  readonly selectedNodeIds: readonly string[];
  readonly past: readonly UiDocumentTransactionRecordV2[];
  readonly future: readonly UiDocumentTransactionRecordV2[];
}

export interface UiAuthoringSessionV2CommandResult {
  readonly state: UiAuthoringSessionStateV2;
  readonly commandResult: ApplyUiDocumentCommandV2Result;
}

export interface ApplyUiDesignSystemPackChangeV2Result {
  readonly state: UiAuthoringSessionStateV2;
  readonly diagnostics: readonly DesignSystemDiagnostic[];
  readonly changed: boolean;
}

export type UiAuthoringRecipeProvenance = DesignSystemContributionProvenance;

export interface UiAuthoringRecipeRef {
  readonly id: string;
  readonly version: string;
  readonly provenance: UiAuthoringRecipeProvenance;
}

export interface UiAuthoringDesignSystemInputSnapshot {
  readonly state: UiDesignSystemState | null;
  readonly registryRevision: number;
  readonly hostWidth?: number;
}

export type UiAuthoringPlanDiagnosticCode =
  | 'stale-document'
  | 'stale-design-system'
  | 'stale-component-catalog'
  | 'role-unresolved'
  | 'layout-unsupported'
  | 'structural-constraint-violation'
  | 'plan-blocked';

export interface UiAuthoringPlanDiagnostic {
  readonly code: UiAuthoringPlanDiagnosticCode;
  readonly message: string;
  readonly path: string;
  readonly commandId?: string;
  readonly nodeId?: string;
  readonly inputId?: string;
  readonly cause?: DesignSystemDiagnostic | UiDocumentIssue | UiDocumentCommandV2Issue;
}

export interface UiAuthoringDetachedPlan {
  readonly planId: string;
  readonly recipe: UiAuthoringRecipeRef;
  readonly documentId: string;
  readonly documentRevision: number;
  readonly designSystemInput: UiAuthoringDesignSystemInputSnapshot;
  readonly endpointSnapshots: readonly {
    readonly nodeId: string;
    readonly component: UiComponentRef;
    readonly input: UiComponentBindingDescriptor;
  }[];
  readonly commands: readonly UiDocumentAtomicCommandV2[];
  readonly diagnostics: readonly UiAuthoringPlanDiagnostic[];
  readonly blocked: boolean;
}

export interface CreateUiAuthoringDetachedPlanInput {
  readonly planId: string;
  readonly recipe: UiAuthoringRecipeRef;
  readonly state: UiAuthoringSessionStateV2;
  readonly designSystemInput: UiAuthoringDesignSystemInputSnapshot;
  readonly componentCatalog: UiComponentCatalogContract;
  readonly commands: readonly UiDocumentAtomicCommandV2[];
}

export interface UiAuthoringPlanPreview {
  readonly planId: string;
  readonly commands: readonly UiDocumentAtomicCommandV2[];
  readonly diagnostics: readonly UiAuthoringPlanDiagnostic[];
  readonly blocked: boolean;
}

export interface UiAuthoringPlanFinalizeContext {
  readonly state: UiAuthoringSessionStateV2;
  readonly designSystemInput: UiAuthoringDesignSystemInputSnapshot;
  readonly componentCatalog: UiComponentCatalogContract;
}

export interface UiAuthoringPlanFinalizeResult {
  readonly command?: UiDocumentCommandV2;
  readonly diagnostics: readonly UiAuthoringPlanDiagnostic[];
}

export interface UiAuthoringBindingProvenance {
  readonly kind: 'document-input-binding';
  readonly path: string;
}

export interface UiAuthoringInputBindingProjection {
  readonly input: UiComponentBindingDescriptor;
  readonly bindingId?: string;
  readonly assignable: boolean;
  readonly reason:
    'available' | 'component-unavailable' | 'input-unavailable' | 'input-output-only';
  readonly provenance: UiAuthoringBindingProvenance | null;
  readonly issues: readonly UiDocumentCommandV2Issue[];
}

export interface UiAuthoringDocumentNodeProjection {
  readonly nodeId: string;
  readonly component: UiComponentRef;
  readonly selected: boolean;
  readonly bindings: readonly UiAuthoringInputBindingProjection[];
  readonly responsiveVariantId?: string;
}

export interface UiAuthoringDocumentProjection {
  readonly documentId: string;
  readonly documentRevision: number;
  readonly nodes: readonly UiAuthoringDocumentNodeProjection[];
  readonly issues: readonly (UiDocumentIssue | UiDocumentCommandV2Issue)[];
}

export interface UiDocumentTransactionRecord {
  readonly transaction: UiDocumentTransaction;
  readonly beforeDocument: UiDocument;
  readonly afterDocument: UiDocument;
  readonly beforeSelectedNodeIds: readonly string[];
  readonly afterSelectedNodeIds: readonly string[];
}

export interface UiAuthoringSessionState {
  readonly document: UiDocument;
  readonly selectedNodeIds: readonly string[];
  readonly past: readonly UiDocumentTransactionRecord[];
  readonly future: readonly UiDocumentTransactionRecord[];
}

export interface UiAuthoringSessionCommandResult {
  readonly state: UiAuthoringSessionState;
  readonly commandResult: ApplyUiDocumentCommandResult;
}

export interface ApplyUiDesignSystemPackChangeResult {
  readonly state: UiAuthoringSessionState;
  readonly diagnostics: readonly DesignSystemDiagnostic[];
  readonly changed: boolean;
}

export interface ProjectUiDesignSystemDocumentResult {
  readonly document?: DesignSystemAuthoredDocumentSnapshot;
  readonly diagnostics: readonly DesignSystemDiagnostic[];
}

export interface UiDocumentMigrationContext {
  readonly widget: Readonly<GenericWidget>;
  readonly path: WidgetPath;
  readonly parentPath: WidgetPath | null;
  readonly existingNodeId: string | null;
  readonly existingComponent: UiComponentRef | null;
}

export interface UiDocumentMigrationIdentity {
  readonly nodeId: string;
  readonly component: UiComponentRef;
}

export interface UiDocumentMigrationFailure {
  readonly error: string;
}

export type UiDocumentMigrationResolver = (
  context: UiDocumentMigrationContext,
) => UiDocumentMigrationIdentity | UiDocumentMigrationFailure;

export interface MigrateWidgetDocumentOptions {
  readonly documentId: string;
  readonly resolveIdentity: UiDocumentMigrationResolver;
}

export interface MigrateWidgetDocumentResult {
  readonly document: UiDocument | null;
  readonly source: string | null;
  readonly issues: readonly UiDocumentIssue[];
}
