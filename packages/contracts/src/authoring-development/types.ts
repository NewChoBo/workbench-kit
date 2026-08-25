import type {
  UiAtomicComponentDescriptor,
  UiComponentDescriptor,
} from '../ui-authoring/component-types';
import type { NodeTypeDescriptor } from '../graph-authoring/types';

export const AUTHORING_DEVELOPMENT_REQUIREMENT_SCHEMA_VERSION = 1 as const;

export const AUTHORING_DEVELOPMENT_REQUIREMENT_ISSUE_CODES = Object.freeze([
  'unsupported-schema-version',
  'malformed-requirement',
  'malformed-intent',
  'unsupported-target-kind',
  'malformed-target',
  'noncanonical-requirement-text',
  'invalid-component-descriptor',
  'composite-component-target',
  'invalid-node-type-descriptor',
  'unsafe-existing-component-descriptor',
  'unsafe-existing-node-type-descriptor',
  'component-catalog-unavailable',
  'node-type-catalog-unavailable',
  'component-identity-conflict',
  'node-type-identity-conflict',
  'requirement-id-conflict',
] as const);

export type AuthoringDevelopmentRequirementIssueCode =
  (typeof AUTHORING_DEVELOPMENT_REQUIREMENT_ISSUE_CODES)[number];

export interface AuthoringDevelopmentIntent {
  readonly summary: string;
  readonly acceptance: readonly string[];
  readonly nonGoals?: readonly string[];
}

export type AuthoringDevelopmentTarget =
  | {
      readonly kind: 'component';
      readonly descriptor: UiAtomicComponentDescriptor;
    }
  | {
      readonly kind: 'node-type';
      readonly descriptor: NodeTypeDescriptor;
    };

export interface AuthoringDevelopmentRequirement {
  readonly schemaVersion: 1;
  readonly requirementId: string;
  readonly target: AuthoringDevelopmentTarget;
  readonly intent: AuthoringDevelopmentIntent;
}

export interface AuthoringDevelopmentRequirementIssue {
  readonly code: AuthoringDevelopmentRequirementIssueCode;
  readonly message: string;
  readonly path: string;
}

export type AuthoringDevelopmentRequirementParseResult =
  | {
      readonly status: 'valid';
      readonly requirement: AuthoringDevelopmentRequirement;
      readonly issues: readonly [];
    }
  | {
      readonly status: 'invalid' | 'unsupported-version';
      readonly requirement?: never;
      readonly issues: readonly AuthoringDevelopmentRequirementIssue[];
    };

export type AuthoringDevelopmentRequirementStatus =
  | 'missing'
  | 'fulfilled'
  | 'identity-conflict'
  | 'catalog-unavailable'
  | 'invalid'
  | 'unsupported-version';

export type AuthoringDevelopmentComponentRequirement = Omit<
  AuthoringDevelopmentRequirement,
  'target'
> & {
  readonly target: Extract<AuthoringDevelopmentTarget, { readonly kind: 'component' }>;
};

export type AuthoringDevelopmentNodeTypeRequirement = Omit<
  AuthoringDevelopmentRequirement,
  'target'
> & {
  readonly target: Extract<AuthoringDevelopmentTarget, { readonly kind: 'node-type' }>;
};

export type AuthoringDevelopmentRequirementResolution =
  | {
      readonly status: 'missing';
      readonly requirement: AuthoringDevelopmentRequirement;
      readonly existingComponent?: never;
      readonly existingNodeType?: never;
      readonly issues: readonly [];
    }
  | {
      readonly status: 'fulfilled';
      readonly requirement: AuthoringDevelopmentComponentRequirement;
      readonly existingComponent: UiComponentDescriptor;
      readonly existingNodeType?: never;
      readonly issues: readonly [];
    }
  | {
      readonly status: 'fulfilled';
      readonly requirement: AuthoringDevelopmentNodeTypeRequirement;
      readonly existingComponent?: never;
      readonly existingNodeType: NodeTypeDescriptor;
      readonly issues: readonly [];
    }
  | {
      readonly status: 'identity-conflict';
      readonly requirement: AuthoringDevelopmentComponentRequirement;
      readonly existingComponent?: UiComponentDescriptor;
      readonly existingNodeType?: never;
      readonly issues: readonly AuthoringDevelopmentRequirementIssue[];
    }
  | {
      readonly status: 'identity-conflict';
      readonly requirement: AuthoringDevelopmentNodeTypeRequirement;
      readonly existingComponent?: never;
      readonly existingNodeType?: NodeTypeDescriptor;
      readonly issues: readonly AuthoringDevelopmentRequirementIssue[];
    }
  | {
      readonly status: 'catalog-unavailable';
      readonly requirement: AuthoringDevelopmentComponentRequirement;
      readonly existingComponent?: never;
      readonly existingNodeType?: never;
      readonly issues: readonly AuthoringDevelopmentRequirementIssue[];
    }
  | {
      readonly status: 'catalog-unavailable';
      readonly requirement: AuthoringDevelopmentNodeTypeRequirement;
      readonly existingComponent?: never;
      readonly existingNodeType?: never;
      readonly issues: readonly AuthoringDevelopmentRequirementIssue[];
    }
  | {
      readonly status: 'invalid' | 'unsupported-version';
      readonly requirement?: never;
      readonly existingComponent?: never;
      readonly existingNodeType?: never;
      readonly issues: readonly AuthoringDevelopmentRequirementIssue[];
    };

export type AuthoringDevelopmentRequirementResumeStatus =
  | 'same-requirement'
  | 'new-requirement'
  | 'requirement-id-conflict'
  | 'invalid'
  | 'unsupported-version';

export type AuthoringDevelopmentRequirementResumeResolution =
  | {
      readonly status: 'same-requirement' | 'new-requirement';
      readonly previous: AuthoringDevelopmentRequirement;
      readonly requirement: AuthoringDevelopmentRequirement;
      readonly issues: readonly [];
    }
  | {
      readonly status: 'requirement-id-conflict';
      readonly previous: AuthoringDevelopmentRequirement;
      readonly requirement: AuthoringDevelopmentRequirement;
      readonly issues: readonly AuthoringDevelopmentRequirementIssue[];
    }
  | {
      readonly status: 'invalid' | 'unsupported-version';
      readonly previous?: never;
      readonly requirement?: never;
      readonly issues: readonly AuthoringDevelopmentRequirementIssue[];
    };
