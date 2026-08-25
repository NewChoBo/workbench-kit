import type { NodeTypeCatalog } from '../graph-authoring/catalog';
import type { NodeTypeDescriptor } from '../graph-authoring/types';
import { validateNodeTypeDescriptor } from '../graph-authoring/validation';
import type { UiComponentCatalogContract } from '../ui-authoring/component-catalog';
import type { UiComponentDescriptor } from '../ui-authoring/component-types';
import { validateUiComponentDescriptor } from '../ui-authoring/component-validation';
import {
  areAuthoringDevelopmentRequirementsEqual,
  areNodeTypeDescriptorsSemanticallyEquivalent,
  areUiComponentDescriptorsSemanticallyEquivalent,
  collectNoncanonicalComponentDescriptorText,
  collectNoncanonicalNodeTypeDescriptorText,
  isSupportedNodeTypeDescriptorShape,
  isSupportedUiComponentDescriptorShape,
} from './semantic-equivalence';
import { snapshotAuthoringDevelopmentValue } from './snapshot';
import {
  AUTHORING_DEVELOPMENT_REQUIREMENT_SCHEMA_VERSION,
  type AuthoringDevelopmentComponentRequirement,
  type AuthoringDevelopmentNodeTypeRequirement,
  type AuthoringDevelopmentRequirement,
  type AuthoringDevelopmentRequirementIssue,
  type AuthoringDevelopmentRequirementIssueCode,
  type AuthoringDevelopmentRequirementParseResult,
  type AuthoringDevelopmentRequirementResolution,
  type AuthoringDevelopmentRequirementResumeResolution,
} from './types';

type PlainRecord = Readonly<Record<string, unknown>>;

const EMPTY_ISSUES = Object.freeze([]) as readonly [];

function isRecord(value: unknown): value is PlainRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(record: PlainRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function hasOnlyKeys(record: PlainRecord, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(record).every((key) => allowed.has(key));
}

function isCanonicalText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function createIssue(
  code: AuthoringDevelopmentRequirementIssueCode,
  message: string,
  path: string,
): AuthoringDevelopmentRequirementIssue {
  return Object.freeze({ code, message, path });
}

function freezeIssues(
  issues: readonly AuthoringDevelopmentRequirementIssue[],
): readonly AuthoringDevelopmentRequirementIssue[] {
  const seen = new Set<string>();
  return Object.freeze(
    issues.filter((entry) => {
      const key = JSON.stringify([entry.code, entry.path]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  );
}

function invalidParseResult(
  issues: readonly AuthoringDevelopmentRequirementIssue[],
): AuthoringDevelopmentRequirementParseResult {
  return Object.freeze({ status: 'invalid', issues: freezeIssues(issues) });
}

function unsupportedVersionParseResult(): AuthoringDevelopmentRequirementParseResult {
  return Object.freeze({
    status: 'unsupported-version',
    issues: Object.freeze([
      createIssue(
        'unsupported-schema-version',
        'The authoring development requirement schema version is unsupported.',
        'schemaVersion',
      ),
    ]),
  });
}

function collectIntentIssues(intent: unknown): readonly AuthoringDevelopmentRequirementIssue[] {
  if (
    !isRecord(intent) ||
    !hasOnlyKeys(intent, ['summary', 'acceptance', 'nonGoals']) ||
    typeof intent.summary !== 'string' ||
    !Array.isArray(intent.acceptance) ||
    !intent.acceptance.every((entry) => typeof entry === 'string') ||
    (hasOwn(intent, 'nonGoals') &&
      (!Array.isArray(intent.nonGoals) ||
        !intent.nonGoals.every((entry) => typeof entry === 'string')))
  ) {
    return Object.freeze([
      createIssue(
        'malformed-intent',
        'The authoring development intent must use the supported declarative shape.',
        'intent',
      ),
    ]);
  }

  const issues: AuthoringDevelopmentRequirementIssue[] = [];
  const nonGoals = intent.nonGoals as readonly string[] | undefined;
  if (!isCanonicalText(intent.summary)) {
    issues.push(
      createIssue(
        'noncanonical-requirement-text',
        'Requirement text must be non-blank and already trimmed.',
        'intent.summary',
      ),
    );
  }
  intent.acceptance.forEach((entry, index) => {
    if (!isCanonicalText(entry)) {
      issues.push(
        createIssue(
          'noncanonical-requirement-text',
          'Requirement text must be non-blank and already trimmed.',
          `intent.acceptance[${index}]`,
        ),
      );
    }
  });
  (nonGoals ?? []).forEach((entry, index) => {
    if (!isCanonicalText(entry)) {
      issues.push(
        createIssue(
          'noncanonical-requirement-text',
          'Requirement text must be non-blank and already trimmed.',
          `intent.nonGoals[${index}]`,
        ),
      );
    }
  });
  return freezeIssues(issues);
}

function collectComponentTargetIssues(
  descriptor: unknown,
): readonly AuthoringDevelopmentRequirementIssue[] {
  if (isRecord(descriptor) && descriptor.kind === 'composite') {
    return Object.freeze([
      createIssue(
        'composite-component-target',
        'Composite components must use the declarative composition path.',
        'target.descriptor.kind',
      ),
    ]);
  }
  if (!isSupportedUiComponentDescriptorShape(descriptor) || descriptor.kind !== 'atomic') {
    return Object.freeze([
      createIssue(
        'invalid-component-descriptor',
        'The component target must be a supported atomic component descriptor.',
        'target.descriptor',
      ),
    ]);
  }

  const issues: AuthoringDevelopmentRequirementIssue[] = [];
  for (const path of collectNoncanonicalComponentDescriptorText(descriptor)) {
    issues.push(
      createIssue(
        'noncanonical-requirement-text',
        'Requirement text must be non-blank and already trimmed.',
        `target.descriptor.${path}`,
      ),
    );
  }
  try {
    for (const descriptorIssue of validateUiComponentDescriptor(descriptor)) {
      issues.push(
        createIssue(
          'invalid-component-descriptor',
          'The component target descriptor is invalid.',
          `target.descriptor.${descriptorIssue.path}`,
        ),
      );
    }
  } catch {
    issues.push(
      createIssue(
        'invalid-component-descriptor',
        'The component target descriptor is invalid.',
        'target.descriptor',
      ),
    );
  }
  return freezeIssues(issues);
}

function collectNodeTypeTargetIssues(
  descriptor: unknown,
): readonly AuthoringDevelopmentRequirementIssue[] {
  if (!isSupportedNodeTypeDescriptorShape(descriptor)) {
    return Object.freeze([
      createIssue(
        'invalid-node-type-descriptor',
        'The node-type target must use the supported node descriptor shape.',
        'target.descriptor',
      ),
    ]);
  }

  const issues: AuthoringDevelopmentRequirementIssue[] = [];
  for (const path of collectNoncanonicalNodeTypeDescriptorText(descriptor)) {
    issues.push(
      createIssue(
        'noncanonical-requirement-text',
        'Requirement text must be non-blank and already trimmed.',
        `target.descriptor.${path}`,
      ),
    );
  }
  try {
    for (const descriptorIssue of validateNodeTypeDescriptor(descriptor)) {
      issues.push(
        createIssue(
          'invalid-node-type-descriptor',
          'The node-type target descriptor is invalid.',
          `target.descriptor.${descriptorIssue.path}`,
        ),
      );
    }
  } catch {
    issues.push(
      createIssue(
        'invalid-node-type-descriptor',
        'The node-type target descriptor is invalid.',
        'target.descriptor',
      ),
    );
  }
  return freezeIssues(issues);
}

function collectTargetIssues(target: unknown): readonly AuthoringDevelopmentRequirementIssue[] {
  if (
    !isRecord(target) ||
    !hasOnlyKeys(target, ['kind', 'descriptor']) ||
    typeof target.kind !== 'string' ||
    !hasOwn(target, 'descriptor')
  ) {
    return Object.freeze([
      createIssue(
        'malformed-target',
        'The authoring development target must use one supported discriminated shape.',
        'target',
      ),
    ]);
  }
  if (target.kind === 'component') return collectComponentTargetIssues(target.descriptor);
  if (target.kind === 'node-type') return collectNodeTypeTargetIssues(target.descriptor);
  return Object.freeze([
    createIssue(
      'unsupported-target-kind',
      'The authoring development target kind is unsupported.',
      'target.kind',
    ),
  ]);
}

export function parseAuthoringDevelopmentRequirement(
  value: unknown,
): AuthoringDevelopmentRequirementParseResult {
  let snapshot: unknown;
  try {
    snapshot = snapshotAuthoringDevelopmentValue(value);
  } catch {
    return invalidParseResult([
      createIssue(
        'malformed-requirement',
        'The authoring development requirement must contain only supported plain data.',
        '$',
      ),
    ]);
  }

  if (!isRecord(snapshot)) {
    return invalidParseResult([
      createIssue(
        'malformed-requirement',
        'The authoring development requirement must use the supported declarative shape.',
        '$',
      ),
    ]);
  }
  if (
    hasOwn(snapshot, 'schemaVersion') &&
    snapshot.schemaVersion !== AUTHORING_DEVELOPMENT_REQUIREMENT_SCHEMA_VERSION
  ) {
    return unsupportedVersionParseResult();
  }

  const issues: AuthoringDevelopmentRequirementIssue[] = [];
  if (
    !hasOnlyKeys(snapshot, ['schemaVersion', 'requirementId', 'target', 'intent']) ||
    snapshot.schemaVersion !== AUTHORING_DEVELOPMENT_REQUIREMENT_SCHEMA_VERSION ||
    typeof snapshot.requirementId !== 'string' ||
    !hasOwn(snapshot, 'target') ||
    !hasOwn(snapshot, 'intent')
  ) {
    issues.push(
      createIssue(
        'malformed-requirement',
        'The authoring development requirement must use the supported declarative shape.',
        '$',
      ),
    );
  }
  if (typeof snapshot.requirementId === 'string' && !isCanonicalText(snapshot.requirementId)) {
    issues.push(
      createIssue(
        'noncanonical-requirement-text',
        'Requirement text must be non-blank and already trimmed.',
        'requirementId',
      ),
    );
  }
  issues.push(...collectIntentIssues(snapshot.intent));
  issues.push(...collectTargetIssues(snapshot.target));

  if (issues.length > 0) return invalidParseResult(issues);
  return Object.freeze({
    status: 'valid',
    requirement: snapshot as unknown as AuthoringDevelopmentRequirement,
    issues: EMPTY_ISSUES,
  });
}

function invalidResolution(
  parsed: Exclude<AuthoringDevelopmentRequirementParseResult, { readonly status: 'valid' }>,
): AuthoringDevelopmentRequirementResolution {
  return Object.freeze({ status: parsed.status, issues: parsed.issues });
}

function unavailableResolution(
  requirement: AuthoringDevelopmentComponentRequirement | AuthoringDevelopmentNodeTypeRequirement,
): AuthoringDevelopmentRequirementResolution {
  const component = requirement.target.kind === 'component';
  return Object.freeze({
    status: 'catalog-unavailable',
    requirement,
    issues: Object.freeze([
      createIssue(
        component ? 'component-catalog-unavailable' : 'node-type-catalog-unavailable',
        component
          ? 'The selected component catalog is unavailable.'
          : 'The selected node-type catalog is unavailable.',
        component ? 'catalogs.components' : 'catalogs.nodeTypes',
      ),
    ]),
  }) as AuthoringDevelopmentRequirementResolution;
}

function resolveComponentRequirement(
  requirement: AuthoringDevelopmentComponentRequirement,
  catalogs: {
    readonly components: UiComponentCatalogContract;
    readonly nodeTypes: NodeTypeCatalog;
  },
): AuthoringDevelopmentRequirementResolution {
  let occupant: UiComponentDescriptor | undefined;
  try {
    occupant = catalogs.components.component(
      Object.freeze({
        id: requirement.target.descriptor.id,
        version: requirement.target.descriptor.version,
      }),
    );
  } catch {
    return unavailableResolution(requirement);
  }
  if (occupant === undefined) {
    return Object.freeze({ status: 'missing', requirement, issues: EMPTY_ISSUES });
  }

  let snapshot: UiComponentDescriptor;
  try {
    snapshot = snapshotAuthoringDevelopmentValue(occupant);
    if (
      !isSupportedUiComponentDescriptorShape(snapshot) ||
      validateUiComponentDescriptor(snapshot).length > 0
    ) {
      throw new TypeError('invalid component descriptor');
    }
  } catch {
    return Object.freeze({
      status: 'identity-conflict',
      requirement,
      issues: Object.freeze([
        createIssue(
          'unsafe-existing-component-descriptor',
          'The existing component descriptor is unsafe or invalid.',
          'catalogs.components',
        ),
      ]),
    });
  }

  if (areUiComponentDescriptorsSemanticallyEquivalent(requirement.target.descriptor, snapshot)) {
    return Object.freeze({
      status: 'fulfilled',
      requirement,
      existingComponent: snapshot,
      issues: EMPTY_ISSUES,
    });
  }
  return Object.freeze({
    status: 'identity-conflict',
    requirement,
    existingComponent: snapshot,
    issues: Object.freeze([
      createIssue(
        'component-identity-conflict',
        'The exact component identity is occupied by a different semantic descriptor.',
        'target.descriptor',
      ),
    ]),
  });
}

function resolveNodeTypeRequirement(
  requirement: AuthoringDevelopmentNodeTypeRequirement,
  catalogs: {
    readonly components: UiComponentCatalogContract;
    readonly nodeTypes: NodeTypeCatalog;
  },
): AuthoringDevelopmentRequirementResolution {
  let occupant: NodeTypeDescriptor | undefined;
  try {
    occupant = catalogs.nodeTypes.nodeType(
      Object.freeze({
        id: requirement.target.descriptor.id,
        version: requirement.target.descriptor.version,
      }),
    );
  } catch {
    return unavailableResolution(requirement);
  }
  if (occupant === undefined) {
    return Object.freeze({ status: 'missing', requirement, issues: EMPTY_ISSUES });
  }

  let snapshot: NodeTypeDescriptor;
  try {
    snapshot = snapshotAuthoringDevelopmentValue(occupant);
    if (
      !isSupportedNodeTypeDescriptorShape(snapshot) ||
      validateNodeTypeDescriptor(snapshot).length > 0
    ) {
      throw new TypeError('invalid node-type descriptor');
    }
  } catch {
    return Object.freeze({
      status: 'identity-conflict',
      requirement,
      issues: Object.freeze([
        createIssue(
          'unsafe-existing-node-type-descriptor',
          'The existing node-type descriptor is unsafe or invalid.',
          'catalogs.nodeTypes',
        ),
      ]),
    });
  }

  if (areNodeTypeDescriptorsSemanticallyEquivalent(requirement.target.descriptor, snapshot)) {
    return Object.freeze({
      status: 'fulfilled',
      requirement,
      existingNodeType: snapshot,
      issues: EMPTY_ISSUES,
    });
  }
  return Object.freeze({
    status: 'identity-conflict',
    requirement,
    existingNodeType: snapshot,
    issues: Object.freeze([
      createIssue(
        'node-type-identity-conflict',
        'The exact node-type identity is occupied by a different semantic descriptor.',
        'target.descriptor',
      ),
    ]),
  });
}

export function resolveAuthoringDevelopmentRequirement(
  requirement: AuthoringDevelopmentRequirement,
  catalogs: {
    readonly components: UiComponentCatalogContract;
    readonly nodeTypes: NodeTypeCatalog;
  },
): AuthoringDevelopmentRequirementResolution {
  const parsed = parseAuthoringDevelopmentRequirement(requirement);
  if (parsed.status !== 'valid') return invalidResolution(parsed);
  if (parsed.requirement.target.kind === 'component') {
    return resolveComponentRequirement(
      parsed.requirement as AuthoringDevelopmentComponentRequirement,
      catalogs,
    );
  }
  return resolveNodeTypeRequirement(
    parsed.requirement as AuthoringDevelopmentNodeTypeRequirement,
    catalogs,
  );
}

export function reconcileAuthoringDevelopmentRequirement(
  previous: unknown,
  next: unknown,
): AuthoringDevelopmentRequirementResumeResolution {
  const parsedPrevious = parseAuthoringDevelopmentRequirement(previous);
  if (parsedPrevious.status !== 'valid') {
    return Object.freeze({ status: parsedPrevious.status, issues: parsedPrevious.issues });
  }
  const parsedNext = parseAuthoringDevelopmentRequirement(next);
  if (parsedNext.status !== 'valid') {
    return Object.freeze({ status: parsedNext.status, issues: parsedNext.issues });
  }

  if (parsedPrevious.requirement.requirementId !== parsedNext.requirement.requirementId) {
    return Object.freeze({
      status: 'new-requirement',
      previous: parsedPrevious.requirement,
      requirement: parsedNext.requirement,
      issues: EMPTY_ISSUES,
    });
  }
  if (
    areAuthoringDevelopmentRequirementsEqual(parsedPrevious.requirement, parsedNext.requirement)
  ) {
    return Object.freeze({
      status: 'same-requirement',
      previous: parsedPrevious.requirement,
      requirement: parsedNext.requirement,
      issues: EMPTY_ISSUES,
    });
  }
  return Object.freeze({
    status: 'requirement-id-conflict',
    previous: parsedPrevious.requirement,
    requirement: parsedNext.requirement,
    issues: Object.freeze([
      createIssue(
        'requirement-id-conflict',
        'The requirement ID is already associated with a different frozen envelope.',
        'requirementId',
      ),
    ]),
  });
}
