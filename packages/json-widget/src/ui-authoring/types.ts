import type {
  DesignSystemDiagnostic,
  DesignSystemAuthoredDocumentSnapshot,
  DesignSystemPackChangeMutation,
  UiComponentRef,
  UiDesignSystemState,
  UiValueSource,
} from '@workbench-kit/contracts';

import type { WidgetPath } from '../document/path.js';
import type { GenericWidget } from '../widget/tree.js';
import type { WidgetPatch } from '../widget/patch.js';

export const UI_DOCUMENT_AUTHORING_ARG = '$authoring' as const;

export interface UiDocumentNodeAuthoring {
  readonly component: UiComponentRef;
  readonly properties: Readonly<Record<string, UiValueSource>>;
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
] as const);

export type UiDocumentIssueCode = (typeof UI_DOCUMENT_ISSUE_CODES)[number];

export interface UiDocumentIssue {
  readonly code: UiDocumentIssueCode;
  readonly message: string;
  readonly path: string;
  readonly nodeId?: string;
  readonly propertyId?: string;
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
  readonly command: UiDocumentTransactionIntent;
  readonly baseRevision: number;
  readonly nextRevision: number;
  readonly patches: readonly WidgetPatch[];
}

export interface UiDesignSystemPackChangeCommand {
  readonly type: 'apply-design-system-pack-change';
  readonly commandId: string;
  readonly mutation: DesignSystemPackChangeMutation;
}

export type UiDocumentTransactionIntent = UiDocumentCommand | UiDesignSystemPackChangeCommand;

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
