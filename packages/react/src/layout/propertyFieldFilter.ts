/**
 * Declared-first property inspector search.
 *
 * Hosts supply a field manifest (id + resolved label + optional section/keywords).
 * Kit filters by query tokens — no DOM scrape.
 */

export interface WorkbenchPropertyFieldManifestEntry {
  /** Stable field id from the product/registry declaration. */
  readonly id: string;
  /** Host-resolved display label (already localized when applicable). */
  readonly label: string;
  /** Optional section/category anchor used to hide empty groups after filter. */
  readonly sectionId?: string;
  /** Extra searchable tokens (aliases, category titles, editor kinds). */
  readonly keywords?: readonly string[];
}

export interface WorkbenchPropertyFieldFilterInput {
  readonly fields: readonly WorkbenchPropertyFieldManifestEntry[];
  /** Free-text query; empty/whitespace returns all fields. */
  readonly query?: string;
}

export interface WorkbenchPropertyFieldFilterResult {
  /** Matching field entries in original order. */
  readonly fields: readonly WorkbenchPropertyFieldManifestEntry[];
  /** Matching field ids (same order as `fields`). */
  readonly fieldIds: readonly string[];
  /** Distinct section ids that still have at least one match. */
  readonly sectionIds: readonly string[];
}

function normalizedSearchText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function fieldSearchText(field: WorkbenchPropertyFieldManifestEntry): string {
  return normalizedSearchText(
    [field.id, field.label, field.sectionId, ...(field.keywords ?? [])]
      .filter((part): part is string => typeof part === 'string' && part.length > 0)
      .join(' '),
  );
}

/**
 * Filters a declared property-field manifest by whitespace-separated query tokens.
 * Every token must match the combined id/label/section/keywords haystack.
 */
export function filterWorkbenchPropertyFields({
  fields,
  query = '',
}: WorkbenchPropertyFieldFilterInput): WorkbenchPropertyFieldFilterResult {
  const tokens = normalizedSearchText(query).split(/\s+/).filter(Boolean);
  const matched =
    tokens.length === 0
      ? [...fields]
      : fields.filter((field) => {
          const haystack = fieldSearchText(field);
          return tokens.every((token) => haystack.includes(token));
        });

  const sectionIds: string[] = [];
  const seenSections = new Set<string>();
  for (const field of matched) {
    const sectionId = field.sectionId;
    if (sectionId === undefined || sectionId.length === 0 || seenSections.has(sectionId)) {
      continue;
    }
    seenSections.add(sectionId);
    sectionIds.push(sectionId);
  }

  return {
    fields: matched,
    fieldIds: matched.map((field) => field.id),
    sectionIds,
  };
}

/** True when the query would hide at least one field from the manifest. */
export function isWorkbenchPropertySearchActive(query: string | undefined): boolean {
  return normalizedSearchText(query ?? '').length > 0;
}
