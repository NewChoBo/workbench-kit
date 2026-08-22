import type { NodeTypeCatalogContribution, NodeTypeDescriptor, NodeTypeRef } from './types';
import { cloneAndFreezeNodeTypeSnapshot } from './snapshot';
import {
  isCanonicalNodeTypeText,
  nodeTypeRefKey,
  validateNodeTypeDescriptor,
  type NodeTypeValidationIssue,
} from './validation';

export interface NodeTypeCatalog {
  nodeType(ref: NodeTypeRef): NodeTypeDescriptor | undefined;
  nodeTypes(): readonly NodeTypeDescriptor[];
}

export interface NodeTypeCatalogResolution {
  readonly catalog: NodeTypeCatalog;
  readonly issues: readonly NodeTypeValidationIssue[];
}

interface IndexedDescriptor {
  readonly contributionIndex: number;
  readonly nodeTypeIndex: number;
  readonly contributorId: string;
  readonly descriptor: NodeTypeDescriptor;
  readonly issues: readonly NodeTypeValidationIssue[];
  readonly refKey: string | null;
}

interface IndexedContribution {
  readonly conflictIssue: NodeTypeValidationIssue | null;
  readonly eligible: boolean;
  readonly descriptors: readonly IndexedDescriptor[];
}

function prefixIssue(
  issue: NodeTypeValidationIssue,
  contributionIndex: number,
  nodeTypeIndex: number,
  contributorId: string,
): NodeTypeValidationIssue {
  return Object.freeze({
    ...issue,
    contributorId,
    path: `contributions[${contributionIndex}].nodeTypes[${nodeTypeIndex}].${issue.path}`,
  });
}

function contributionIssue(
  contribution: NodeTypeCatalogContribution,
  contributionIndex: number,
  code: 'blank-contributor-id' | 'duplicate-contributor-id',
): NodeTypeValidationIssue {
  return Object.freeze({
    code,
    message:
      code === 'blank-contributor-id'
        ? 'Node type contributor id must be non-blank and already trimmed.'
        : `Node type contributor id "${contribution.contributorId}" conflicts with another contribution.`,
    path: `contributions[${contributionIndex}].contributorId`,
    contributorId: contribution.contributorId,
  });
}

function duplicateNodeTypeIssue(entry: IndexedDescriptor): NodeTypeValidationIssue {
  return Object.freeze({
    code: 'duplicate-node-type-ref',
    message: `Node type exact identity ${entry.refKey ?? 'unknown'} conflicts with another definition.`,
    path: `contributions[${entry.contributionIndex}].nodeTypes[${entry.nodeTypeIndex}]`,
    contributorId: entry.contributorId,
    nodeTypeId: entry.descriptor.id,
    nodeTypeVersion: entry.descriptor.version,
  });
}

export function resolveNodeTypeCatalog(
  contributions: readonly NodeTypeCatalogContribution[],
): NodeTypeCatalogResolution {
  const contributorCounts = new Map<string, number>();
  for (const contribution of contributions) {
    if (isCanonicalNodeTypeText(contribution.contributorId)) {
      contributorCounts.set(
        contribution.contributorId,
        (contributorCounts.get(contribution.contributorId) ?? 0) + 1,
      );
    }
  }

  const indexedContributions: IndexedContribution[] = contributions.map(
    (contribution, contributionIndex) => {
      const canonical = isCanonicalNodeTypeText(contribution.contributorId);
      const duplicate = canonical && (contributorCounts.get(contribution.contributorId) ?? 0) > 1;
      const conflictIssue = !canonical
        ? contributionIssue(contribution, contributionIndex, 'blank-contributor-id')
        : duplicate
          ? contributionIssue(contribution, contributionIndex, 'duplicate-contributor-id')
          : null;
      const descriptors = contribution.nodeTypes.map((descriptor, nodeTypeIndex) => {
        const issues = validateNodeTypeDescriptor(descriptor).map((issue) =>
          prefixIssue(issue, contributionIndex, nodeTypeIndex, contribution.contributorId),
        );
        const refKey =
          isCanonicalNodeTypeText(descriptor.id) && isCanonicalNodeTypeText(descriptor.version)
            ? nodeTypeRefKey(descriptor)
            : null;
        return {
          contributionIndex,
          nodeTypeIndex,
          contributorId: contribution.contributorId,
          descriptor,
          issues,
          refKey,
        } satisfies IndexedDescriptor;
      });
      return { conflictIssue, eligible: conflictIssue === null, descriptors };
    },
  );

  const refCounts = new Map<string, number>();
  for (const contribution of indexedContributions) {
    if (!contribution.eligible) continue;
    for (const entry of contribution.descriptors) {
      if (entry.refKey !== null) {
        refCounts.set(entry.refKey, (refCounts.get(entry.refKey) ?? 0) + 1);
      }
    }
  }

  const issues: NodeTypeValidationIssue[] = [];
  const nodeTypes: NodeTypeDescriptor[] = [];
  for (const contribution of indexedContributions) {
    if (contribution.conflictIssue !== null) issues.push(contribution.conflictIssue);
    for (const entry of contribution.descriptors) {
      issues.push(...entry.issues);
      const duplicate =
        contribution.eligible && entry.refKey !== null && (refCounts.get(entry.refKey) ?? 0) > 1;
      if (duplicate) issues.push(duplicateNodeTypeIssue(entry));
      if (contribution.eligible && entry.issues.length === 0 && !duplicate) {
        nodeTypes.push(cloneAndFreezeNodeTypeSnapshot(entry.descriptor));
      }
    }
  }

  const frozenNodeTypes = Object.freeze(nodeTypes);
  const byId = new Map<string, Map<string, NodeTypeDescriptor>>();
  for (const nodeType of frozenNodeTypes) {
    const byVersion = byId.get(nodeType.id) ?? new Map<string, NodeTypeDescriptor>();
    byVersion.set(nodeType.version, nodeType);
    byId.set(nodeType.id, byVersion);
  }

  return Object.freeze({
    catalog: Object.freeze<NodeTypeCatalog>({
      nodeType(ref) {
        return byId.get(ref.id)?.get(ref.version);
      },
      nodeTypes() {
        return frozenNodeTypes;
      },
    }),
    issues: Object.freeze(issues.map((issue) => Object.freeze(issue))),
  });
}
