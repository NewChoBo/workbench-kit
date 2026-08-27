import type { UiComponentBindingDescriptor, UiComponentRef } from '../ui-authoring/component-types';
import type { UiValueSchema, UiValueType } from '../ui-authoring/types';

export interface UiSourceValueDescriptor {
  readonly id: string;
  readonly value: UiValueSchema;
  readonly semanticRole?: string;
}

export interface UiSourceInputTargetDescriptor {
  readonly nodeId: string;
  readonly component: UiComponentRef;
  readonly input: UiComponentBindingDescriptor;
  readonly currentBindingId?: string;
}

export interface UiValueCompatibilitySchemaSnapshot {
  readonly type: UiValueType;
  readonly constraints?: Readonly<Record<string, unknown>>;
}

export interface UiValueConversionEvidence {
  readonly id: string;
  readonly source: UiValueCompatibilitySchemaSnapshot;
  readonly target: UiValueCompatibilitySchemaSnapshot;
}

export interface UiSourceBindingAssignment {
  readonly sourceId: string;
  readonly bindingId: string;
}

export const UI_SOURCE_INPUT_COMPATIBILITY_SCHEMA_VERSION = 1 as const;

export const UI_SOURCE_INPUT_LIMITS = Object.freeze({
  maxSources: 64,
  maxDocumentNodes: 1024,
  maxComponentLookups: 1024,
  maxTargetEndpoints: 1024,
  maxConversionEvidence: 1024,
  maxPairs: 65536,
  maxPortableDepth: 32,
  maxPortableValues: 65536,
  maxArrayItems: 4096,
  maxObjectKeys: 256,
  maxStringCodeUnits: 4096,
} as const);

export const UI_SOURCE_INPUT_ISSUE_CODES = Object.freeze([
  'invalid-request',
  'unsupported-version',
  'request-too-large',
  'invalid-source',
  'duplicate-source',
  'invalid-target',
  'duplicate-target',
  'component-catalog-unavailable',
  'invalid-conversion',
  'duplicate-conversion',
  'invalid-binding-assignment',
  'missing-binding-assignment',
  'extra-binding-assignment',
  'duplicate-binding-id',
  'target-output-only',
  'target-binding-disallowed',
  'target-occupied',
  'type-mismatch',
  'constraint-mismatch',
  'no-declared-conversion',
  'no-compatible-target',
  'ambiguous-exact',
  'convertible-only',
  'selection-required',
  'source-unselected',
  'invalid-selection',
  'target-contended',
  'no-change',
  'stale-source',
  'stale-assigned-binding',
  'stale-target-binding',
  'stale-conversion-evidence',
  'stale-selection',
  'stale-plan',
  'stale-recipe',
  'stale-document',
  'stale-design-system',
  'stale-component-catalog',
] as const);

export type UiSourceInputIssueCode = (typeof UI_SOURCE_INPUT_ISSUE_CODES)[number];

export type UiSourceInputIssueCoordinateKey = 'sourceId' | 'nodeId' | 'inputId' | 'conversionId';

export type UiSourceInputIssueBase<
  TCode extends UiSourceInputIssueCode,
  TCoordinates extends Partial<Record<UiSourceInputIssueCoordinateKey, string>> = Record<
    never,
    never
  >,
> = {
  readonly code: TCode;
  readonly message: string;
  readonly path: string;
} & TCoordinates & {
    readonly [TKey in Exclude<UiSourceInputIssueCoordinateKey, keyof TCoordinates>]?: never;
  };

export type UiSourceInputAdmissionIssue =
  | UiSourceInputIssueBase<'invalid-request' | 'unsupported-version' | 'request-too-large'>
  | UiSourceInputIssueBase<'invalid-source', { readonly sourceId?: string }>
  | UiSourceInputIssueBase<'duplicate-source', { readonly sourceId: string }>
  | UiSourceInputIssueBase<
      'invalid-target',
      { readonly nodeId?: string; readonly inputId?: string }
    >
  | UiSourceInputIssueBase<
      'duplicate-target',
      { readonly nodeId: string; readonly inputId: string }
    >
  | UiSourceInputIssueBase<'component-catalog-unavailable', { readonly nodeId: string }>
  | UiSourceInputIssueBase<'invalid-conversion', { readonly conversionId?: string }>
  | UiSourceInputIssueBase<'duplicate-conversion', { readonly conversionId: string }>
  | UiSourceInputIssueBase<'invalid-binding-assignment', { readonly sourceId?: string }>
  | UiSourceInputIssueBase<
      'missing-binding-assignment' | 'extra-binding-assignment' | 'duplicate-binding-id',
      { readonly sourceId: string }
    >;

export type UiSourceInputIncompatibleIssue =
  | UiSourceInputIssueBase<
      | 'target-output-only'
      | 'target-binding-disallowed'
      | 'target-occupied'
      | 'type-mismatch'
      | 'constraint-mismatch'
      | 'no-declared-conversion',
      { readonly sourceId: string; readonly nodeId: string; readonly inputId: string }
    >
  | UiSourceInputIssueBase<'no-compatible-target', { readonly sourceId: string }>;

export type UiSourceInputRecommendationIssue = UiSourceInputIssueBase<
  'ambiguous-exact' | 'convertible-only',
  { readonly sourceId: string }
>;

export type UiSourceInputPlanIssue =
  | UiSourceInputAdmissionIssue
  | UiSourceInputIncompatibleIssue
  | UiSourceInputRecommendationIssue
  | UiSourceInputIssueBase<
      'selection-required' | 'source-unselected',
      { readonly sourceId: string }
    >
  | UiSourceInputIssueBase<
      'invalid-selection',
      { readonly sourceId?: string; readonly nodeId?: string; readonly inputId?: string }
    >
  | UiSourceInputIssueBase<
      'target-contended',
      { readonly sourceId: string; readonly nodeId: string; readonly inputId: string }
    >
  | UiSourceInputIssueBase<'no-change'>;

export type UiSourceInputStaleIssue =
  | UiSourceInputIssueBase<'stale-source', { readonly sourceId: string }>
  | UiSourceInputIssueBase<'stale-assigned-binding', { readonly sourceId: string }>
  | UiSourceInputIssueBase<
      'stale-target-binding',
      { readonly sourceId: string; readonly nodeId: string; readonly inputId: string }
    >
  | UiSourceInputIssueBase<'stale-conversion-evidence', { readonly conversionId?: string }>
  | UiSourceInputIssueBase<
      'stale-selection',
      { readonly sourceId?: string; readonly nodeId?: string; readonly inputId?: string }
    >
  | UiSourceInputIssueBase<'stale-plan'>
  | UiSourceInputIssueBase<
      'stale-recipe' | 'stale-document' | 'stale-design-system' | 'stale-component-catalog'
    >;

export type UiSourceInputIssue = UiSourceInputPlanIssue | UiSourceInputStaleIssue;

export interface UiSourceInputCandidateBase {
  readonly sourceId: string;
  readonly target: UiSourceInputTargetDescriptor;
  readonly semanticRoleMatched: boolean;
}

export interface UiExactSourceInputCandidate extends UiSourceInputCandidateBase {
  readonly compatibility: { readonly kind: 'exact' };
}

export interface UiConvertibleSourceInputCandidate extends UiSourceInputCandidateBase {
  readonly compatibility: {
    readonly kind: 'convertible';
    readonly conversionIds: readonly [string, ...string[]];
  };
}

export interface UiIncompatibleSourceInputCandidate extends UiSourceInputCandidateBase {
  readonly compatibility: {
    readonly kind: 'incompatible';
    readonly reason:
      | 'target-output-only'
      | 'target-binding-disallowed'
      | 'target-occupied'
      | 'type-mismatch'
      | 'constraint-mismatch'
      | 'no-declared-conversion';
  };
}

export type UiSourceInputCandidate =
  | UiExactSourceInputCandidate
  | UiConvertibleSourceInputCandidate
  | UiIncompatibleSourceInputCandidate;

export type UiSourceInputResolution =
  | {
      readonly sourceId: string;
      readonly status: 'resolved';
      readonly candidate: UiExactSourceInputCandidate;
    }
  | {
      readonly sourceId: string;
      readonly status: 'ambiguous';
      readonly candidates: readonly [
        UiExactSourceInputCandidate,
        UiExactSourceInputCandidate,
        ...UiExactSourceInputCandidate[],
      ];
    }
  | {
      readonly sourceId: string;
      readonly status: 'convertible';
      readonly candidates: readonly [
        UiConvertibleSourceInputCandidate,
        ...UiConvertibleSourceInputCandidate[],
      ];
    }
  | {
      readonly sourceId: string;
      readonly status: 'incompatible';
      readonly issues: readonly [
        UiSourceInputIncompatibleIssue,
        ...UiSourceInputIncompatibleIssue[],
      ];
    };

export interface UiSourceInputCompatibilityRequestV1 {
  readonly schemaVersion: 1;
  readonly sources: readonly [UiSourceValueDescriptor, ...UiSourceValueDescriptor[]];
  readonly targets: readonly UiSourceInputTargetDescriptor[];
  readonly bindings: readonly [UiSourceBindingAssignment, ...UiSourceBindingAssignment[]];
  readonly conversionEvidence?: readonly UiValueConversionEvidence[];
}

export type UiSourceInputRequestSnapshotV1 = UiSourceInputCompatibilityRequestV1;

export type UiSourceInputCandidateSetResult =
  | {
      readonly status: 'ready';
      readonly snapshot: UiSourceInputRequestSnapshotV1;
      readonly candidates: readonly UiSourceInputCandidate[];
      readonly resolutions: readonly UiSourceInputResolution[];
    }
  | {
      readonly status: 'blocked';
      readonly issues: readonly [UiSourceInputAdmissionIssue, ...UiSourceInputAdmissionIssue[]];
      readonly snapshot?: never;
      readonly candidates?: never;
      readonly resolutions?: never;
    };
