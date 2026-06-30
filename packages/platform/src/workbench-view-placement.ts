export interface WorkbenchViewPlacementContainerLike {
  readonly id: string;
}

export interface WorkbenchViewPlacementViewLike {
  readonly containerId: string;
  readonly id: string;
}

export interface ResolveWorkbenchViewContainerRegistryInput<
  TBaseContainer extends WorkbenchViewPlacementContainerLike,
  TContributedContainer extends WorkbenchViewPlacementContainerLike,
  TResolvedBaseContainer extends WorkbenchViewPlacementContainerLike,
  TResolvedContributedContainer extends WorkbenchViewPlacementContainerLike,
> {
  readonly baseContainers?: ReadonlyArray<TBaseContainer> | undefined;
  readonly compareContainers?:
    | ((
        left: TResolvedBaseContainer | TResolvedContributedContainer,
        right: TResolvedBaseContainer | TResolvedContributedContainer,
      ) => number)
    | undefined;
  readonly contributedContainers: ReadonlyArray<TContributedContainer>;
  readonly mapBaseContainer?: ((container: TBaseContainer) => TResolvedBaseContainer) | undefined;
  readonly mapContributedContainer?:
    | ((container: TContributedContainer) => TResolvedContributedContainer)
    | undefined;
}

export interface WorkbenchViewContainerRegistry<
  TContainer extends WorkbenchViewPlacementContainerLike,
  TConflict extends WorkbenchViewPlacementContainerLike,
> {
  readonly conflicts: ReadonlyArray<TConflict>;
  readonly containers: ReadonlyArray<TContainer>;
}

export interface BuildWorkbenchViewPlacementModelInput<
  TContainer extends WorkbenchViewPlacementContainerLike,
  TConflict extends WorkbenchViewPlacementContainerLike,
  TView extends WorkbenchViewPlacementViewLike,
> {
  readonly conflictContainers?: ReadonlyArray<TConflict> | undefined;
  readonly containerId?: string | undefined;
  readonly containers: ReadonlyArray<TContainer>;
  readonly views: ReadonlyArray<TView>;
}

export interface WorkbenchViewPlacementModel<
  TContainer extends WorkbenchViewPlacementContainerLike,
  TConflict extends WorkbenchViewPlacementContainerLike,
  TView extends WorkbenchViewPlacementViewLike,
> {
  readonly conflicts: ReadonlyArray<TConflict>;
  readonly containers: ReadonlyArray<TContainer>;
  readonly orphanedViews: ReadonlyArray<TView>;
  readonly views: ReadonlyArray<TView>;
}

export function resolveWorkbenchViewContainerRegistry<
  TBaseContainer extends WorkbenchViewPlacementContainerLike,
  TContributedContainer extends WorkbenchViewPlacementContainerLike,
  TResolvedBaseContainer extends WorkbenchViewPlacementContainerLike = TBaseContainer,
  TResolvedContributedContainer extends WorkbenchViewPlacementContainerLike = TContributedContainer,
>({
  baseContainers = [],
  compareContainers = compareWorkbenchViewContainersById,
  contributedContainers,
  mapBaseContainer,
  mapContributedContainer,
}: ResolveWorkbenchViewContainerRegistryInput<
  TBaseContainer,
  TContributedContainer,
  TResolvedBaseContainer,
  TResolvedContributedContainer
>): WorkbenchViewContainerRegistry<
  TResolvedBaseContainer | TResolvedContributedContainer,
  TContributedContainer
> {
  const reservedContainerIds = new Set(baseContainers.map((container) => container.id));
  const contributedContainerIds = new Set<string>();
  const conflicts: TContributedContainer[] = [];
  const containers: Array<TResolvedBaseContainer | TResolvedContributedContainer> =
    baseContainers.map((container) =>
      mapBaseContainer === undefined
        ? (container as unknown as TResolvedBaseContainer)
        : mapBaseContainer(container),
    );

  for (const container of contributedContainers) {
    if (reservedContainerIds.has(container.id) || contributedContainerIds.has(container.id)) {
      conflicts.push(container);
      continue;
    }

    contributedContainerIds.add(container.id);
    containers.push(
      mapContributedContainer === undefined
        ? (container as unknown as TResolvedContributedContainer)
        : mapContributedContainer(container),
    );
  }

  containers.sort(compareContainers);

  return {
    conflicts,
    containers,
  };
}

export function buildWorkbenchViewPlacementModel<
  TContainer extends WorkbenchViewPlacementContainerLike,
  TConflict extends WorkbenchViewPlacementContainerLike = TContainer,
  TView extends WorkbenchViewPlacementViewLike = WorkbenchViewPlacementViewLike,
>({
  conflictContainers = [],
  containerId,
  containers,
  views,
}: BuildWorkbenchViewPlacementModelInput<
  TContainer,
  TConflict,
  TView
>): WorkbenchViewPlacementModel<TContainer, TConflict, TView> {
  const registeredContainerIds = new Set(containers.map((container) => container.id));
  const matchingViews = views.filter((view) => matchesContainerId(view.containerId, containerId));

  return {
    conflicts: conflictContainers.filter((container) =>
      matchesContainerId(container.id, containerId),
    ),
    containers: containers.filter((container) => matchesContainerId(container.id, containerId)),
    orphanedViews: matchingViews.filter((view) => !registeredContainerIds.has(view.containerId)),
    views: matchingViews.filter((view) => registeredContainerIds.has(view.containerId)),
  };
}

function matchesContainerId(candidateId: string, containerId: string | undefined): boolean {
  return containerId === undefined || candidateId === containerId;
}

function compareWorkbenchViewContainersById(
  left: WorkbenchViewPlacementContainerLike,
  right: WorkbenchViewPlacementContainerLike,
): number {
  return left.id.localeCompare(right.id);
}
