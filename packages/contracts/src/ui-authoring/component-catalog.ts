import type {
  UiComponentCatalogContribution,
  UiComponentDescriptor,
  UiComponentRef,
} from './component-types';
import {
  uiComponentRefKey,
  validateUiComponentDescriptor,
  type UiComponentValidationIssue,
} from './component-validation';

export interface UiComponentCatalogContract {
  component(ref: UiComponentRef): UiComponentDescriptor | undefined;
  components(): readonly UiComponentDescriptor[];
}

export interface UiComponentCatalogResolution {
  readonly catalog: UiComponentCatalogContract;
  readonly issues: readonly UiComponentValidationIssue[];
}

interface IndexedDescriptor {
  readonly contributionIndex: number;
  readonly componentIndex: number;
  readonly contributorId: string;
  readonly descriptor: UiComponentDescriptor;
  readonly issues: readonly UiComponentValidationIssue[];
  readonly refKey: string | null;
}

interface IndexedContribution {
  readonly conflictIssue: UiComponentValidationIssue | null;
  readonly eligible: boolean;
  readonly descriptors: readonly IndexedDescriptor[];
}

function isCanonicalText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function prefixIssue(
  issue: UiComponentValidationIssue,
  contributionIndex: number,
  componentIndex: number,
  contributorId: string,
): UiComponentValidationIssue {
  return Object.freeze({
    ...issue,
    contributorId,
    path: `contributions[${contributionIndex}].components[${componentIndex}].${issue.path}`,
  });
}

function duplicateContributorIssue(
  contribution: UiComponentCatalogContribution,
  contributionIndex: number,
): UiComponentValidationIssue {
  return Object.freeze({
    code: 'duplicate-contributor-id',
    message: `UI component contributor id "${contribution.contributorId}" conflicts with another contribution.`,
    path: `contributions[${contributionIndex}].contributorId`,
    contributorId: contribution.contributorId,
  });
}

function blankContributorIssue(
  contribution: UiComponentCatalogContribution,
  contributionIndex: number,
): UiComponentValidationIssue {
  return Object.freeze({
    code: 'blank-contributor-id',
    message: 'UI component contributor id must be non-blank and already trimmed.',
    path: `contributions[${contributionIndex}].contributorId`,
    contributorId: contribution.contributorId,
  });
}

function duplicateComponentIssue(entry: IndexedDescriptor): UiComponentValidationIssue {
  return Object.freeze({
    code: 'duplicate-component-ref',
    message: `UI component exact identity ${entry.refKey ?? 'unknown'} conflicts with another definition.`,
    path: `contributions[${entry.contributionIndex}].components[${entry.componentIndex}]`,
    contributorId: entry.contributorId,
    componentId: entry.descriptor.id,
    componentVersion: entry.descriptor.version,
  });
}

export function resolveUiComponentCatalog(
  contributions: readonly UiComponentCatalogContribution[],
): UiComponentCatalogResolution {
  const contributorCounts = new Map<string, number>();
  for (const contribution of contributions) {
    if (isCanonicalText(contribution.contributorId)) {
      contributorCounts.set(
        contribution.contributorId,
        (contributorCounts.get(contribution.contributorId) ?? 0) + 1,
      );
    }
  }

  const indexedContributions: IndexedContribution[] = contributions.map(
    (contribution, contributionIndex) => {
      const canonicalContributorId = isCanonicalText(contribution.contributorId);
      const duplicatedContributorId =
        canonicalContributorId && (contributorCounts.get(contribution.contributorId) ?? 0) > 1;
      const conflictIssue = !canonicalContributorId
        ? blankContributorIssue(contribution, contributionIndex)
        : duplicatedContributorId
          ? duplicateContributorIssue(contribution, contributionIndex)
          : null;
      const descriptors = contribution.components.map((descriptor, componentIndex) => {
        const descriptorIssues = validateUiComponentDescriptor(descriptor).map((issue) =>
          prefixIssue(issue, contributionIndex, componentIndex, contribution.contributorId),
        );
        const refKey =
          isCanonicalText(descriptor.id) && isCanonicalText(descriptor.version)
            ? uiComponentRefKey(descriptor)
            : null;
        return {
          contributionIndex,
          componentIndex,
          contributorId: contribution.contributorId,
          descriptor,
          issues: descriptorIssues,
          refKey,
        } satisfies IndexedDescriptor;
      });

      return {
        conflictIssue,
        eligible: conflictIssue === null,
        descriptors,
      };
    },
  );

  const componentCounts = new Map<string, number>();
  for (const indexedContribution of indexedContributions) {
    if (!indexedContribution.eligible) {
      continue;
    }
    for (const entry of indexedContribution.descriptors) {
      if (entry.refKey !== null) {
        componentCounts.set(entry.refKey, (componentCounts.get(entry.refKey) ?? 0) + 1);
      }
    }
  }

  const issues: UiComponentValidationIssue[] = [];
  const components: UiComponentDescriptor[] = [];
  for (const indexedContribution of indexedContributions) {
    if (indexedContribution.conflictIssue !== null) {
      issues.push(indexedContribution.conflictIssue);
    }

    for (const entry of indexedContribution.descriptors) {
      issues.push(...entry.issues);
      const duplicate =
        indexedContribution.eligible &&
        entry.refKey !== null &&
        (componentCounts.get(entry.refKey) ?? 0) > 1;
      if (duplicate) {
        issues.push(duplicateComponentIssue(entry));
      }
      if (indexedContribution.eligible && entry.issues.length === 0 && !duplicate) {
        components.push(entry.descriptor);
      }
    }
  }

  const frozenComponents = Object.freeze([...components]);
  const byId = new Map<string, Map<string, UiComponentDescriptor>>();
  for (const component of frozenComponents) {
    const byVersion = byId.get(component.id) ?? new Map<string, UiComponentDescriptor>();
    byVersion.set(component.version, component);
    byId.set(component.id, byVersion);
  }

  const catalog = Object.freeze<UiComponentCatalogContract>({
    component(ref) {
      return byId.get(ref.id)?.get(ref.version);
    },
    components() {
      return frozenComponents;
    },
  });

  return Object.freeze({
    catalog,
    issues: Object.freeze(issues.map((issue) => Object.freeze(issue))),
  });
}
