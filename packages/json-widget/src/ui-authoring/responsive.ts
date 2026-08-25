import type { UiDocumentV3Issue, UiResponsiveVariantDescriptor } from './types.js';

interface NormalizedResponsiveVariant {
  readonly descriptor: UiResponsiveVariantDescriptor;
  readonly minInclusive: number;
  readonly maxExclusive: number;
}

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function readOwnDataValue(
  value: object,
  key: PropertyKey,
): { readonly present: boolean; readonly value?: unknown; readonly valid: boolean } {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined) return { present: false, valid: true };
  if (
    descriptor.enumerable !== true ||
    !Object.prototype.hasOwnProperty.call(descriptor, 'value')
  ) {
    return { present: true, valid: false };
  }
  return { present: true, valid: true, value: descriptor.value };
}

function isCanonicalText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function hasOnlyKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function issue(
  code: UiDocumentV3Issue['code'],
  message: string,
  path: string,
  variantId?: string,
): UiDocumentV3Issue {
  return Object.freeze({
    code,
    message,
    path,
    ...(variantId === undefined ? {} : { variantId }),
  });
}

function compareCanonicalText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeVariant(
  value: unknown,
  path: string,
): {
  readonly variant?: NormalizedResponsiveVariant;
  readonly issues: readonly UiDocumentV3Issue[];
} {
  if (!isPlainRecord(value)) {
    return {
      issues: Object.freeze([
        issue(
          'invalid-responsive-variant-catalog',
          'Responsive variant descriptors must be plain declarative objects.',
          path,
        ),
      ]),
    };
  }

  const idValue = readOwnDataValue(value, 'id');
  const hostWidthValue = readOwnDataValue(value, 'hostWidth');
  if (
    !idValue.valid ||
    !isCanonicalText(idValue.value) ||
    !hostWidthValue.valid ||
    !isPlainRecord(hostWidthValue.value) ||
    !hasOnlyKeys(value, ['id', 'hostWidth']) ||
    !hasOnlyKeys(hostWidthValue.value, ['minInclusive', 'maxExclusive'])
  ) {
    return {
      issues: Object.freeze([
        issue(
          'invalid-responsive-variant-catalog',
          'Responsive variants require a canonical id and a plain host-width range.',
          path,
          isCanonicalText(idValue.value) ? idValue.value : undefined,
        ),
      ]),
    };
  }

  const variantId = idValue.value;
  const minValue = readOwnDataValue(hostWidthValue.value, 'minInclusive');
  const maxValue = readOwnDataValue(hostWidthValue.value, 'maxExclusive');
  const minInclusive = minValue.present ? minValue.value : 0;
  const maxExclusive = maxValue.present ? maxValue.value : Number.POSITIVE_INFINITY;
  const validMin =
    minValue.valid &&
    typeof minInclusive === 'number' &&
    Number.isFinite(minInclusive) &&
    minInclusive >= 0;
  const validMax =
    maxValue.valid &&
    typeof maxExclusive === 'number' &&
    (maxValue.present
      ? Number.isFinite(maxExclusive) && maxExclusive >= 0
      : maxExclusive === Number.POSITIVE_INFINITY);
  if (
    !validMin ||
    !validMax ||
    minInclusive >= maxExclusive ||
    (minInclusive === 0 && maxExclusive === Number.POSITIVE_INFINITY)
  ) {
    return {
      issues: Object.freeze([
        issue(
          'invalid-responsive-range',
          'Responsive ranges require a finite non-negative lower bound and/or upper bound with minInclusive < maxExclusive.',
          `${path}.hostWidth`,
          variantId,
        ),
      ]),
    };
  }

  const hostWidth = Object.freeze({
    ...(minInclusive === 0 ? {} : { minInclusive }),
    ...(maxExclusive === Number.POSITIVE_INFINITY ? {} : { maxExclusive }),
  });
  return {
    variant: Object.freeze({
      descriptor: Object.freeze({ id: variantId, hostWidth }),
      minInclusive,
      maxExclusive,
    }),
    issues: Object.freeze([]),
  };
}

function resolveCatalog(
  value: unknown,
  path: string,
): {
  readonly variants: readonly NormalizedResponsiveVariant[];
  readonly issues: readonly UiDocumentV3Issue[];
} {
  if (!Array.isArray(value)) {
    return {
      variants: Object.freeze([]),
      issues: Object.freeze([
        issue(
          'invalid-responsive-variant-catalog',
          'The responsive variant catalog must be an array.',
          path,
        ),
      ]),
    };
  }

  const variants: NormalizedResponsiveVariant[] = [];
  const issues: UiDocumentV3Issue[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const resolved = normalizeVariant(value[index], `${path}[${index}]`);
    issues.push(...resolved.issues);
    if (resolved.variant !== undefined) variants.push(resolved.variant);
  }

  const idCounts = new Map<string, number>();
  for (const variant of variants) {
    idCounts.set(variant.descriptor.id, (idCounts.get(variant.descriptor.id) ?? 0) + 1);
  }
  for (const variant of variants) {
    if ((idCounts.get(variant.descriptor.id) ?? 0) > 1) {
      issues.push(
        issue(
          'duplicate-responsive-variant-id',
          `Responsive variant id "${variant.descriptor.id}" is duplicated.`,
          path,
          variant.descriptor.id,
        ),
      );
    }
  }

  const sorted = [...variants].sort(
    (left, right) =>
      left.minInclusive - right.minInclusive ||
      left.maxExclusive - right.maxExclusive ||
      compareCanonicalText(left.descriptor.id, right.descriptor.id),
  );
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]!;
    const current = sorted[index]!;
    if (current.minInclusive < previous.maxExclusive) {
      issues.push(
        issue(
          'overlapping-responsive-range',
          `Responsive variant "${current.descriptor.id}" overlaps "${previous.descriptor.id}".`,
          path,
          current.descriptor.id,
        ),
      );
    }
  }

  return { variants: Object.freeze(sorted), issues: Object.freeze(issues) };
}

export function validateUiResponsiveVariantCatalog(
  value: unknown,
  path = 'root.$authoring.responsiveVariants',
): readonly UiDocumentV3Issue[] {
  return resolveCatalog(value, path).issues;
}

export function canonicalizeUiResponsiveVariantCatalog(
  variants: readonly UiResponsiveVariantDescriptor[],
): readonly UiResponsiveVariantDescriptor[] {
  const resolved = resolveCatalog(variants, 'responsiveVariants');
  if (resolved.issues.length > 0) {
    throw new TypeError(resolved.issues[0]!.message);
  }
  return Object.freeze(resolved.variants.map((variant) => variant.descriptor));
}

export function resolveActiveUiResponsiveVariant(
  variants: readonly UiResponsiveVariantDescriptor[],
  hostWidth: number,
): UiResponsiveVariantDescriptor | undefined {
  if (!Number.isFinite(hostWidth) || hostWidth < 0) return undefined;
  const resolved = resolveCatalog(variants, 'responsiveVariants');
  if (resolved.issues.length > 0) return undefined;
  return resolved.variants.find(
    (variant) => hostWidth >= variant.minInclusive && hostWidth < variant.maxExclusive,
  )?.descriptor;
}

export function resolveUiResponsiveVariantRepresentativeWidth(
  variant: UiResponsiveVariantDescriptor,
): number {
  const resolved = normalizeVariant(variant, 'variant');
  if (resolved.variant === undefined || resolved.issues.length > 0) {
    throw new TypeError(resolved.issues[0]?.message ?? 'Responsive variant is invalid.');
  }
  const { minInclusive, maxExclusive } = resolved.variant;
  if (maxExclusive === Number.POSITIVE_INFINITY) return minInclusive;
  if (minInclusive === 0) return maxExclusive / 2;
  return minInclusive + (maxExclusive - minInclusive) / 2;
}
