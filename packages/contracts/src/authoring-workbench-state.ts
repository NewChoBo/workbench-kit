export type TilePaperAuthoringResourceKind = 'launchpad' | 'tile' | 'library-item';

export interface TilePaperAuthoringResourceReference {
  readonly id: string;
  readonly kind: TilePaperAuthoringResourceKind;
}

export interface BuildLaunchpadAuthoringWorkbenchStateInput {
  readonly generatedAt: string;
  readonly launchpads: ReadonlyArray<BuildLaunchpadAuthoringWorkbenchSummaryInput>;
  readonly workspaceName?: string | undefined;
}

export interface BuildLaunchpadAuthoringWorkbenchStateFromFilesInput {
  readonly generatedAt: string;
  readonly launchpadFiles: ReadonlyArray<BuildLaunchpadAuthoringWorkbenchSummaryInput>;
  readonly workspaceName?: string | undefined;
}

export interface BuildLaunchpadAuthoringWorkbenchSummaryInput {
  readonly issueCount: number;
  readonly issues: readonly string[];
  readonly layerCount?: number | undefined;
  readonly layoutMode?: string | undefined;
  readonly name: string;
  readonly relativePath: string;
  readonly tiles?: readonly TilePaperLaunchpadAuthoringTileSummary[] | undefined;
  readonly tileCount: number;
  readonly uri: string;
  readonly valid: boolean;
}

export interface TilePaperAuthoringIssueInput {
  readonly code?: string | undefined;
  readonly message?: string | undefined;
  readonly path?: string | undefined;
  readonly severity: string;
}

export interface BuildLaunchpadAuthoringWorkbenchSummaryFromResourceInput {
  readonly id: string;
  readonly issues: readonly TilePaperAuthoringIssueInput[];
  readonly layerCount?: number | undefined;
  readonly layoutMode?: string | undefined;
  readonly name: string;
  readonly relativePath?: string | undefined;
  readonly tiles?: readonly TilePaperLaunchpadAuthoringTileSummary[] | undefined;
  readonly tileCount?: number | undefined;
  readonly uri?: string | undefined;
  readonly valid?: boolean | undefined;
}

export interface BuildLaunchpadAuthoringWorkbenchTileSummaryFromResourceInput {
  readonly launchType: string | null;
  readonly name: string;
  readonly nodeId: string;
  readonly target: string | null;
}

export interface LibraryAuthoringEntrySummary {
  readonly id: string;
  readonly label: string;
  readonly sourcePath?: string | null | undefined;
}

export interface BuildLibraryAuthoringWorkbenchEntrySummaryFromResourceInput {
  readonly id: string;
  readonly sourcePath?: string | null | undefined;
  readonly title: string;
}

export interface TilePaperLaunchpadAuthoringTileSummary {
  readonly launchType: string | null;
  readonly name: string;
  readonly nodeId: string;
  readonly target: string | null;
}

export interface TilePaperLaunchpadAuthoringSummary {
  readonly issueCount: number;
  readonly issues: readonly string[];
  readonly layerCount?: number | undefined;
  readonly layoutMode?: string | undefined;
  readonly name: string;
  readonly relativePath: string;
  readonly tiles?: readonly TilePaperLaunchpadAuthoringTileSummary[] | undefined;
  readonly tileCount: number;
  readonly uri: string;
  readonly valid: boolean;
}

export interface TilePaperLaunchpadAuthoringWorkbenchState {
  readonly generatedAt: string;
  readonly launchpads: readonly TilePaperLaunchpadAuthoringSummary[];
  readonly workspaceName?: string | undefined;
}

export interface TilePaperLibraryAuthoringFileSummary {
  readonly documentKind?: string | undefined;
  readonly issueCount: number;
  readonly issues: readonly string[];
  readonly itemCount?: number | undefined;
  readonly relativePath: string;
  readonly ruleCount?: number | undefined;
  readonly uri: string;
  readonly valid: boolean;
}

export interface TilePaperLibraryAuthoringWorkbenchState {
  readonly generatedAt: string;
  readonly libraryFiles: readonly TilePaperLibraryAuthoringFileSummary[];
  readonly workspaceName?: string | undefined;
}

export interface BuildLibraryAuthoringWorkbenchStateInput {
  readonly entries: ReadonlyArray<LibraryAuthoringEntrySummary>;
  readonly generatedAt: string;
  readonly workspaceName?: string | undefined;
}

export interface BuildLibraryAuthoringWorkbenchFileSummaryInput {
  readonly documentKind?: string | undefined;
  readonly issueCount: number;
  readonly issues: readonly string[];
  readonly itemCount?: number | undefined;
  readonly relativePath: string;
  readonly ruleCount?: number | undefined;
  readonly uri: string;
  readonly valid: boolean;
}

export interface BuildLibraryAuthoringWorkbenchFileSummaryFromResourceInput {
  readonly documentKind?: string | undefined;
  readonly issues: readonly TilePaperAuthoringIssueInput[];
  readonly itemCount?: number | undefined;
  readonly relativePath: string;
  readonly ruleCount?: number | undefined;
  readonly uri: string;
  readonly valid?: boolean | undefined;
}

export interface BuildLibraryAuthoringWorkbenchStateFromFilesInput {
  readonly generatedAt: string;
  readonly libraryFiles: ReadonlyArray<BuildLibraryAuthoringWorkbenchFileSummaryInput>;
  readonly workspaceName?: string | undefined;
}

const tilePaperAuthoringProtocol = 'tilepaper-authoring:';

export function buildLaunchpadAuthoringWorkbenchState({
  generatedAt,
  launchpads,
  workspaceName,
}: BuildLaunchpadAuthoringWorkbenchStateInput): TilePaperLaunchpadAuthoringWorkbenchState {
  return {
    generatedAt,
    launchpads: launchpads.map(buildLaunchpadAuthoringWorkbenchSummary),
    ...(workspaceName === undefined ? {} : { workspaceName }),
  };
}

export function buildLaunchpadAuthoringWorkbenchStateFromFiles({
  generatedAt,
  launchpadFiles,
  workspaceName,
}: BuildLaunchpadAuthoringWorkbenchStateFromFilesInput): TilePaperLaunchpadAuthoringWorkbenchState {
  return {
    generatedAt,
    launchpads: launchpadFiles.map(buildLaunchpadAuthoringWorkbenchSummary),
    ...(workspaceName === undefined ? {} : { workspaceName }),
  };
}

export function buildLibraryAuthoringWorkbenchState({
  entries,
  generatedAt,
  workspaceName,
}: BuildLibraryAuthoringWorkbenchStateInput): TilePaperLibraryAuthoringWorkbenchState {
  return {
    generatedAt,
    libraryFiles: entries.map(buildLibraryAuthoringFileSummary),
    ...(workspaceName === undefined ? {} : { workspaceName }),
  };
}

export function buildLibraryAuthoringWorkbenchStateFromFiles({
  generatedAt,
  libraryFiles,
  workspaceName,
}: BuildLibraryAuthoringWorkbenchStateFromFilesInput): TilePaperLibraryAuthoringWorkbenchState {
  return {
    generatedAt,
    libraryFiles: libraryFiles.map(buildLibraryAuthoringWorkbenchFileSummary),
    ...(workspaceName === undefined ? {} : { workspaceName }),
  };
}

export function createTilePaperAuthoringResourceUri(
  reference: TilePaperAuthoringResourceReference,
): string {
  return `tilepaper-authoring://${reference.kind}/${encodeURIComponent(reference.id)}`;
}

export function parseTilePaperAuthoringResourceUri(
  uri: string,
): TilePaperAuthoringResourceReference | null {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return null;
  }

  if (parsed.protocol !== tilePaperAuthoringProtocol) return null;

  const kind = parsed.hostname;
  if (!isTilePaperAuthoringResourceKind(kind)) return null;

  let id: string;
  try {
    id = decodeURIComponent(parsed.pathname.replace(/^\/+/u, ''));
  } catch {
    return null;
  }

  return id.length === 0 ? null : { id, kind };
}

export function resolveTilePaperAuthoringResourceId(
  uri: string,
  kind: TilePaperAuthoringResourceKind,
): string | null {
  const reference = parseTilePaperAuthoringResourceUri(uri);
  return reference?.kind === kind ? reference.id : null;
}

export function buildLibraryAuthoringWorkbenchFileSummary({
  documentKind,
  issueCount,
  issues,
  itemCount,
  relativePath,
  ruleCount,
  uri,
  valid,
}: BuildLibraryAuthoringWorkbenchFileSummaryInput): TilePaperLibraryAuthoringFileSummary {
  return {
    ...(documentKind === undefined ? {} : { documentKind }),
    issueCount,
    issues,
    ...(itemCount === undefined ? {} : { itemCount }),
    relativePath,
    ...(ruleCount === undefined ? {} : { ruleCount }),
    uri,
    valid,
  };
}

export function buildLibraryAuthoringWorkbenchFileSummaryFromResource({
  documentKind,
  issues,
  itemCount,
  relativePath,
  ruleCount,
  uri,
  valid,
}: BuildLibraryAuthoringWorkbenchFileSummaryFromResourceInput): BuildLibraryAuthoringWorkbenchFileSummaryInput {
  return buildLibraryAuthoringWorkbenchFileSummary({
    ...(documentKind === undefined ? {} : { documentKind }),
    issueCount: issues.length,
    issues: issues.map(formatTilePaperAuthoringIssue),
    ...(itemCount === undefined ? {} : { itemCount }),
    relativePath,
    ...(ruleCount === undefined ? {} : { ruleCount }),
    uri,
    valid: valid ?? !issues.some((issue) => issue.severity === 'error'),
  });
}

export function buildLibraryAuthoringWorkbenchEntrySummaryFromResource({
  id,
  sourcePath,
  title,
}: BuildLibraryAuthoringWorkbenchEntrySummaryFromResourceInput): LibraryAuthoringEntrySummary {
  return {
    id,
    label: title,
    sourcePath,
  };
}

export function buildLaunchpadAuthoringWorkbenchSummary({
  issueCount,
  issues,
  layerCount,
  layoutMode,
  name,
  relativePath,
  tiles,
  tileCount,
  uri,
  valid,
}: BuildLaunchpadAuthoringWorkbenchSummaryInput): TilePaperLaunchpadAuthoringSummary {
  return {
    issueCount,
    issues,
    ...(layerCount === undefined ? {} : { layerCount }),
    ...(layoutMode === undefined ? {} : { layoutMode }),
    name,
    relativePath,
    tileCount: tiles?.length ?? tileCount,
    ...(tiles === undefined ? {} : { tiles }),
    uri,
    valid,
  };
}

export function buildLaunchpadAuthoringWorkbenchTileSummaryFromResource({
  launchType,
  name,
  nodeId,
  target,
}: BuildLaunchpadAuthoringWorkbenchTileSummaryFromResourceInput): TilePaperLaunchpadAuthoringTileSummary {
  return {
    launchType,
    name,
    nodeId,
    target,
  };
}

export function buildLaunchpadAuthoringWorkbenchSummaryFromResource({
  id,
  issues,
  layerCount,
  layoutMode,
  name,
  relativePath,
  tiles,
  tileCount,
  uri,
  valid,
}: BuildLaunchpadAuthoringWorkbenchSummaryFromResourceInput): BuildLaunchpadAuthoringWorkbenchSummaryInput {
  return buildLaunchpadAuthoringWorkbenchSummary({
    issueCount: issues.length,
    issues: issues.map(formatTilePaperAuthoringIssue),
    ...(layerCount === undefined ? {} : { layerCount }),
    ...(layoutMode === undefined ? {} : { layoutMode }),
    name,
    relativePath: relativePath ?? id,
    ...(tiles === undefined ? {} : { tiles }),
    tileCount: tileCount ?? tiles?.length ?? 0,
    uri:
      uri ??
      createTilePaperAuthoringResourceUri({
        id,
        kind: 'launchpad',
      }),
    valid: valid ?? !issues.some((issue) => issue.severity === 'error'),
  });
}

function buildLibraryAuthoringFileSummary(
  entry: LibraryAuthoringEntrySummary,
): TilePaperLibraryAuthoringFileSummary {
  return buildLibraryAuthoringWorkbenchFileSummary({
    issueCount: 0,
    issues: [],
    relativePath: entry.sourcePath ?? entry.label,
    uri: createTilePaperAuthoringResourceUri({
      id: entry.id,
      kind: 'library-item',
    }),
    valid: true,
  });
}

function isTilePaperAuthoringResourceKind(value: string): value is TilePaperAuthoringResourceKind {
  return value === 'launchpad' || value === 'tile' || value === 'library-item';
}

function formatTilePaperAuthoringIssue(issue: TilePaperAuthoringIssueInput): string {
  if (issue.message !== undefined) {
    return issue.path === undefined ? issue.message : `${issue.path}: ${issue.message}`;
  }

  return issue.code === undefined ? issue.severity : `${issue.severity}: ${issue.code}`;
}
