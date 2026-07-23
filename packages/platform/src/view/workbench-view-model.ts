export type WorkbenchViewTabClosePolicy = 'dirty-guard' | 'pinned' | 'transient';

/** Activity bar has only two slots — no multi-section grouping. */
export type WorkbenchViewActivityBarPlacement = 'footer' | 'primary';

export interface WorkbenchViewContribution<
  TViewId extends string,
  TLabelKey extends string,
  TIcon = unknown,
> {
  readonly activityBarPlacement: WorkbenchViewActivityBarPlacement;
  readonly closePolicy: WorkbenchViewTabClosePolicy;
  readonly icon: TIcon;
  readonly id: TViewId;
  readonly labelKey: TLabelKey;
}

export interface WorkbenchViewActivityBarItem<TViewId extends string, TIcon = unknown> {
  readonly icon: TIcon;
  readonly id: TViewId;
  readonly label: string;
}

export interface WorkbenchViewActivityBarModel<TViewId extends string, TIcon = unknown> {
  readonly footerItems: ReadonlyArray<WorkbenchViewActivityBarItem<TViewId, TIcon>>;
  readonly items: ReadonlyArray<WorkbenchViewActivityBarItem<TViewId, TIcon>>;
}

export interface WorkbenchViewEditorTabItem<TViewId extends string, TIcon = unknown> {
  readonly closable: boolean;
  readonly dirty: boolean;
  readonly icon: TIcon;
  readonly id: TViewId;
  readonly label: string;
}

export function buildWorkbenchViewActivityBarModel<
  TViewId extends string,
  TLabelKey extends string,
  TIcon = unknown,
>({
  descriptors,
  resolveLabel,
}: {
  descriptors: ReadonlyArray<WorkbenchViewContribution<TViewId, TLabelKey, TIcon>>;
  resolveLabel: (labelKey: TLabelKey) => string;
}): WorkbenchViewActivityBarModel<TViewId, TIcon> {
  return {
    footerItems: buildWorkbenchViewActivityBarItems(descriptors, 'footer', resolveLabel),
    items: buildWorkbenchViewActivityBarItems(descriptors, 'primary', resolveLabel),
  };
}

export function buildWorkbenchViewEditorTabs<
  TViewId extends string,
  TLabelKey extends string,
  TIcon = unknown,
>({
  dirtyViewIds,
  descriptors,
  openViewIds,
  resolveLabel,
}: {
  descriptors: ReadonlyArray<WorkbenchViewContribution<TViewId, TLabelKey, TIcon>>;
  dirtyViewIds: ReadonlySet<TViewId>;
  openViewIds: ReadonlyArray<TViewId>;
  resolveLabel: (labelKey: TLabelKey) => string;
}): ReadonlyArray<WorkbenchViewEditorTabItem<TViewId, TIcon>> {
  const descriptorById = new Map<TViewId, WorkbenchViewContribution<TViewId, TLabelKey, TIcon>>(
    descriptors.map((descriptor) => [descriptor.id, descriptor]),
  );

  return openViewIds.map((viewId) => {
    const descriptor = descriptorById.get(viewId);
    if (descriptor === undefined) {
      throw new Error(`Unknown workbench view: ${viewId}`);
    }

    const dirty = dirtyViewIds.has(viewId);

    return {
      closable: resolveWorkbenchViewTabClosable(descriptor.closePolicy, dirty),
      dirty,
      icon: descriptor.icon,
      id: descriptor.id,
      label: resolveLabel(descriptor.labelKey),
    };
  });
}

export function resolveWorkbenchViewTabClosable(
  closePolicy: WorkbenchViewTabClosePolicy,
  dirty: boolean,
): boolean {
  if (closePolicy === 'pinned') {
    return false;
  }

  if (closePolicy === 'dirty-guard' && dirty) {
    return false;
  }

  return true;
}

function buildWorkbenchViewActivityBarItems<
  TViewId extends string,
  TLabelKey extends string,
  TIcon,
>(
  descriptors: ReadonlyArray<WorkbenchViewContribution<TViewId, TLabelKey, TIcon>>,
  placement: WorkbenchViewActivityBarPlacement,
  resolveLabel: (labelKey: TLabelKey) => string,
): ReadonlyArray<WorkbenchViewActivityBarItem<TViewId, TIcon>> {
  return descriptors
    .filter((descriptor) => descriptor.activityBarPlacement === placement)
    .map((descriptor) => ({
      icon: descriptor.icon,
      id: descriptor.id,
      label: resolveLabel(descriptor.labelKey),
    }));
}
