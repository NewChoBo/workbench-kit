import { toDisposable, type Disposable } from '@workbench-kit/base';
import {
  designSystemPackRefKey,
  isCanonicalDesignSystemText,
  snapshotDesignSystemPackContribution,
  validateDesignSystemPackDescriptor,
  validateDesignSystemPackRef,
  type DesignSystemDiagnostic,
  type DesignSystemPackContribution,
  type DesignSystemPackDescriptor,
  type DesignSystemPackRef,
} from '@workbench-kit/contracts';

export type DesignSystemPackLookupResult =
  | { readonly status: 'resolved'; readonly descriptor: DesignSystemPackDescriptor }
  | {
      readonly status: 'invalid-request';
      readonly ref: DesignSystemPackRef;
      readonly diagnostics: readonly DesignSystemDiagnostic[];
    }
  | { readonly status: 'not-installed'; readonly ref: DesignSystemPackRef }
  | {
      readonly status: 'version-unavailable';
      readonly ref: DesignSystemPackRef;
      readonly availableVersions: readonly string[];
    }
  | {
      readonly status: 'invalid';
      readonly ref: DesignSystemPackRef;
      readonly diagnostics: readonly DesignSystemDiagnostic[];
    }
  | {
      readonly status: 'conflicted';
      readonly ref: DesignSystemPackRef;
      readonly diagnostics: readonly DesignSystemDiagnostic[];
    };

export interface DesignSystemPackRegistrySnapshot {
  readonly revision: number;
  packs(): readonly DesignSystemPackDescriptor[];
  diagnostics(): readonly DesignSystemDiagnostic[];
  lookup(ref: DesignSystemPackRef): DesignSystemPackLookupResult;
}

interface Registration {
  readonly key: symbol;
  readonly contribution: DesignSystemPackContribution;
}

interface IndexedContribution {
  readonly contribution: DesignSystemPackContribution;
  readonly diagnostics: readonly DesignSystemDiagnostic[];
  readonly duplicate: boolean;
  readonly index: number;
}

interface IndexedPack {
  readonly contribution: IndexedContribution;
  readonly descriptor: DesignSystemPackDescriptor;
  readonly descriptorDiagnostics: readonly DesignSystemDiagnostic[];
  readonly diagnostics: readonly DesignSystemDiagnostic[];
  readonly duplicate: boolean;
  readonly index: number;
  readonly refKey: string | null;
}

function freezeRef(ref: DesignSystemPackRef): DesignSystemPackRef {
  return Object.freeze({ id: ref.id, version: ref.version });
}

function freezeDiagnostics(
  diagnostics: readonly DesignSystemDiagnostic[],
): readonly DesignSystemDiagnostic[] {
  return Object.freeze(
    diagnostics.map((diagnostic) =>
      Object.freeze({
        ...diagnostic,
        ...(diagnostic.availableVersions !== undefined
          ? { availableVersions: Object.freeze([...diagnostic.availableVersions]) }
          : {}),
      }),
    ),
  );
}

function duplicateContributionDiagnostic(
  contribution: DesignSystemPackContribution,
  contributionIndex: number,
): DesignSystemDiagnostic {
  return Object.freeze({
    code: 'duplicate-contribution-id',
    message: `Design System contribution id "${contribution.contributionId}" conflicts with another contribution.`,
    path: `contributions[${contributionIndex}].contributionId`,
    contributionId: contribution.contributionId,
  });
}

function blankContributionDiagnostic(
  contribution: DesignSystemPackContribution,
  contributionIndex: number,
): DesignSystemDiagnostic {
  return Object.freeze({
    code: 'blank-contribution-id',
    message: 'Design System contribution id must be non-blank and already trimmed.',
    path: `contributions[${contributionIndex}].contributionId`,
    contributionId: contribution.contributionId,
  });
}

function duplicatePackDiagnostic(entry: IndexedPack): DesignSystemDiagnostic {
  return Object.freeze({
    code: 'duplicate-pack-ref',
    message: `Design System Pack exact identity ${entry.refKey ?? 'unknown'} conflicts with another definition.`,
    path: `contributions[${entry.contribution.index}].packs[${entry.index}]`,
    contributionId: entry.contribution.contribution.contributionId,
    packId: entry.descriptor.ref.id,
    requestedVersion: entry.descriptor.ref.version,
  });
}

function buildSnapshot(
  revision: number,
  contributions: readonly DesignSystemPackContribution[],
): DesignSystemPackRegistrySnapshot {
  const contributionCounts = new Map<string, number>();
  for (const contribution of contributions) {
    if (isCanonicalDesignSystemText(contribution.contributionId)) {
      contributionCounts.set(
        contribution.contributionId,
        (contributionCounts.get(contribution.contributionId) ?? 0) + 1,
      );
    }
  }

  const indexedContributions: IndexedContribution[] = contributions.map((contribution, index) => {
    const canonical = isCanonicalDesignSystemText(contribution.contributionId);
    const duplicate = canonical && (contributionCounts.get(contribution.contributionId) ?? 0) > 1;
    const diagnostics = !canonical
      ? [blankContributionDiagnostic(contribution, index)]
      : duplicate
        ? [duplicateContributionDiagnostic(contribution, index)]
        : [];
    return { contribution, diagnostics, duplicate, index };
  });

  const indexedPacks: IndexedPack[] = indexedContributions.flatMap((contribution) =>
    contribution.contribution.packs.map((descriptor, index) => {
      const descriptorDiagnostics = validateDesignSystemPackDescriptor(
        descriptor,
        `contributions[${contribution.index}].packs[${index}]`,
      ).map((diagnostic) => ({
        ...diagnostic,
        contributionId: contribution.contribution.contributionId,
      }));
      const refKey =
        validateDesignSystemPackRef(descriptor.ref).length === 0
          ? designSystemPackRefKey(descriptor.ref)
          : null;
      return {
        contribution,
        descriptor,
        descriptorDiagnostics,
        diagnostics: descriptorDiagnostics,
        duplicate: false,
        index,
        refKey,
      };
    }),
  );

  const refCounts = new Map<string, number>();
  for (const entry of indexedPacks) {
    if (entry.refKey !== null) {
      refCounts.set(entry.refKey, (refCounts.get(entry.refKey) ?? 0) + 1);
    }
  }

  const packs = indexedPacks.map((entry) => {
    const duplicate = entry.refKey !== null && (refCounts.get(entry.refKey) ?? 0) > 1;
    const diagnostics = duplicate
      ? [...entry.descriptorDiagnostics, duplicatePackDiagnostic(entry)]
      : entry.descriptorDiagnostics;
    return { ...entry, diagnostics: freezeDiagnostics(diagnostics), duplicate };
  });

  const validPacks = Object.freeze(
    packs
      .filter(
        (entry) => entry.contribution.diagnostics.length === 0 && entry.diagnostics.length === 0,
      )
      .map((entry) => entry.descriptor),
  );
  const allDiagnostics = freezeDiagnostics(
    indexedContributions.flatMap((contribution) => [
      ...contribution.diagnostics,
      ...packs
        .filter((entry) => entry.contribution === contribution)
        .flatMap((entry) => entry.diagnostics),
    ]),
  );

  return Object.freeze<DesignSystemPackRegistrySnapshot>({
    revision,
    packs() {
      return validPacks;
    },
    diagnostics() {
      return allDiagnostics;
    },
    lookup(ref) {
      const requestDiagnostics = validateDesignSystemPackRef(ref, 'ref');
      const frozenRef = freezeRef(ref);
      if (requestDiagnostics.length > 0) {
        return Object.freeze({
          status: 'invalid-request',
          ref: frozenRef,
          diagnostics: requestDiagnostics,
        });
      }

      const key = designSystemPackRefKey(ref);
      const exactEntries = packs.filter((entry) => entry.refKey === key);
      if (exactEntries.length === 0) {
        const versions = [
          ...new Set(
            packs
              .filter((entry) => entry.refKey !== null && entry.descriptor.ref.id === ref.id)
              .map((entry) => entry.descriptor.ref.version),
          ),
        ].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
        if (versions.length === 0) {
          return Object.freeze({ status: 'not-installed', ref: frozenRef });
        }
        return Object.freeze({
          status: 'version-unavailable',
          ref: frozenRef,
          availableVersions: Object.freeze(versions),
        });
      }

      const conflicted =
        exactEntries.length > 1 ||
        exactEntries.some((entry) => entry.contribution.duplicate || entry.duplicate);
      if (conflicted) {
        return Object.freeze({
          status: 'conflicted',
          ref: frozenRef,
          diagnostics: freezeDiagnostics(
            exactEntries.flatMap((entry) => [
              ...entry.contribution.diagnostics.filter(
                (diagnostic) => diagnostic.code === 'duplicate-contribution-id',
              ),
              ...entry.diagnostics.filter((diagnostic) => diagnostic.code === 'duplicate-pack-ref'),
            ]),
          ),
        });
      }

      const [entry] = exactEntries;
      const invalidDiagnostics = freezeDiagnostics([
        ...entry.contribution.diagnostics,
        ...entry.descriptorDiagnostics,
      ]);
      if (invalidDiagnostics.length > 0) {
        return Object.freeze({
          status: 'invalid',
          ref: frozenRef,
          diagnostics: invalidDiagnostics,
        });
      }

      return Object.freeze({ status: 'resolved', descriptor: entry.descriptor });
    },
  });
}

export class DesignSystemPackRegistry {
  private registrations: Registration[] = [];
  private revision = 0;

  register(contribution: DesignSystemPackContribution): Disposable {
    const registration = Object.freeze({
      key: Symbol('design-system-pack-registration'),
      contribution: snapshotDesignSystemPackContribution(contribution),
    });
    this.registrations.push(registration);
    this.revision += 1;

    let disposed = false;
    return toDisposable(() => {
      if (disposed) return;
      disposed = true;
      const index = this.registrations.findIndex((candidate) => candidate.key === registration.key);
      if (index === -1) return;
      this.registrations.splice(index, 1);
      this.revision += 1;
    });
  }

  snapshot(): DesignSystemPackRegistrySnapshot {
    return buildSnapshot(
      this.revision,
      this.registrations.map((registration) => registration.contribution),
    );
  }
}
