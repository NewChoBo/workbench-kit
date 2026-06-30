export interface WorkbenchViewRouteSnapshot<TViewId extends string> {
  readonly activeViewId: TViewId;
  readonly openViewIds: ReadonlyArray<TViewId>;
}

export interface ResolveWorkbenchViewRouteSnapshotOptions<TViewId extends string> {
  readonly defaultViewId: TViewId;
  readonly isViewId: (value: string | null) => value is TViewId;
  readonly search: string;
  readonly tabsParam?: string | undefined;
  readonly viewParam?: string | undefined;
}

export interface BuildWorkbenchViewRouteSearchOptions {
  readonly discardedParams?: ReadonlyArray<string> | undefined;
  readonly tabsParam?: string | undefined;
  readonly viewParam?: string | undefined;
}

export interface NormalizeWorkbenchViewRouteTabsOptions<TViewId extends string> {
  readonly activeViewId: TViewId;
  readonly defaultViewId: TViewId;
  readonly isViewId: (value: string | null) => value is TViewId;
  readonly routeTabs: string | null;
}

export interface CloseWorkbenchViewRouteOptions<TViewId extends string> {
  readonly defaultViewId: TViewId;
  readonly snapshot: WorkbenchViewRouteSnapshot<TViewId>;
  readonly viewId: TViewId;
}

const DEFAULT_WORKBENCH_VIEW_ROUTE_TABS_PARAM = 'tabs';
const DEFAULT_WORKBENCH_VIEW_ROUTE_VIEW_PARAM = 'view';

export function resolveWorkbenchViewRouteSnapshot<TViewId extends string>({
  defaultViewId,
  isViewId,
  search,
  tabsParam = DEFAULT_WORKBENCH_VIEW_ROUTE_TABS_PARAM,
  viewParam = DEFAULT_WORKBENCH_VIEW_ROUTE_VIEW_PARAM,
}: ResolveWorkbenchViewRouteSnapshotOptions<TViewId>): WorkbenchViewRouteSnapshot<TViewId> {
  const params = new URLSearchParams(search);
  const routeView = params.get(viewParam);
  const activeViewId = isViewId(routeView) ? routeView : defaultViewId;

  return {
    activeViewId,
    openViewIds: normalizeWorkbenchViewRouteTabs({
      activeViewId,
      defaultViewId,
      isViewId,
      routeTabs: params.get(tabsParam),
    }),
  };
}

export function buildWorkbenchViewRouteSearch<TViewId extends string>(
  currentSearch: string,
  snapshot: WorkbenchViewRouteSnapshot<TViewId>,
  {
    discardedParams = [],
    tabsParam = DEFAULT_WORKBENCH_VIEW_ROUTE_TABS_PARAM,
    viewParam = DEFAULT_WORKBENCH_VIEW_ROUTE_VIEW_PARAM,
  }: BuildWorkbenchViewRouteSearchOptions = {},
): string {
  const params = new URLSearchParams(currentSearch);
  params.set(viewParam, snapshot.activeViewId);
  params.set(tabsParam, snapshot.openViewIds.join(','));

  for (const param of discardedParams) {
    params.delete(param);
  }

  return `?${params.toString()}`;
}

export function openWorkbenchViewRoute<TViewId extends string>(
  openViewIds: ReadonlyArray<TViewId>,
  viewId: TViewId,
): ReadonlyArray<TViewId> {
  return openViewIds.includes(viewId) ? openViewIds : [...openViewIds, viewId];
}

export function closeWorkbenchViewRoute<TViewId extends string>({
  defaultViewId,
  snapshot,
  viewId,
}: CloseWorkbenchViewRouteOptions<TViewId>): WorkbenchViewRouteSnapshot<TViewId> {
  if (
    viewId === defaultViewId ||
    snapshot.openViewIds.length <= 1 ||
    !snapshot.openViewIds.includes(viewId)
  ) {
    return snapshot;
  }

  const closeIndex = snapshot.openViewIds.indexOf(viewId);
  const nextOpenViewIds = snapshot.openViewIds.filter((openViewId) => openViewId !== viewId);
  const fallbackViewId =
    nextOpenViewIds[Math.min(closeIndex, nextOpenViewIds.length - 1)] ?? defaultViewId;

  return {
    activeViewId: snapshot.activeViewId === viewId ? fallbackViewId : snapshot.activeViewId,
    openViewIds: nextOpenViewIds,
  };
}

export function areWorkbenchViewRouteSnapshotsEqual<TViewId extends string>(
  left: WorkbenchViewRouteSnapshot<TViewId>,
  right: WorkbenchViewRouteSnapshot<TViewId>,
): boolean {
  return (
    left.activeViewId === right.activeViewId &&
    left.openViewIds.length === right.openViewIds.length &&
    left.openViewIds.every((viewId, index) => right.openViewIds[index] === viewId)
  );
}

export function normalizeWorkbenchViewRouteTabs<TViewId extends string>({
  activeViewId,
  defaultViewId,
  isViewId,
  routeTabs,
}: NormalizeWorkbenchViewRouteTabsOptions<TViewId>): ReadonlyArray<TViewId> {
  const routeViewIds =
    routeTabs
      ?.split(',')
      .map((value) => value.trim())
      .filter(isViewId) ?? [];
  const nextOpenViewIds = new Set<TViewId>([defaultViewId, ...routeViewIds, activeViewId]);

  return [...nextOpenViewIds];
}
