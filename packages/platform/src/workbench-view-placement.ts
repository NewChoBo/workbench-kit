export interface WorkbenchViewPlacementContainerLike {
  readonly id: string;
}

export interface WorkbenchViewPlacementViewLike {
  readonly containerId: string;
  readonly id: string;
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
