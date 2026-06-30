export type WorkbenchViewTabClosePolicy = 'dirty-guard' | 'pinned' | 'transient';

export interface WorkbenchViewContribution<
  TViewId extends string,
  TSectionId extends string,
  TLabelKey extends string,
  TIcon = unknown,
> {
  readonly activityBarSectionId: TSectionId;
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
  readonly sections: ReadonlyArray<ReadonlyArray<WorkbenchViewActivityBarItem<TViewId, TIcon>>>;
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
  TSectionId extends string,
  TLabelKey extends string,
  TIcon = unknown,
>({
  descriptors,
  footerSectionIds,
  resolveLabel,
  sectionIds,
}: {
  descriptors: ReadonlyArray<WorkbenchViewContribution<TViewId, TSectionId, TLabelKey, TIcon>>;
  footerSectionIds: ReadonlyArray<TSectionId>;
  resolveLabel: (labelKey: TLabelKey) => string;
  sectionIds: ReadonlyArray<TSectionId>;
}): WorkbenchViewActivityBarModel<TViewId, TIcon> {
  return {
    footerItems: footerSectionIds.flatMap((sectionId) =>
      buildWorkbenchViewActivityBarItems(descriptors, sectionId, resolveLabel),
    ),
    sections: sectionIds.map((sectionId) =>
      buildWorkbenchViewActivityBarItems(descriptors, sectionId, resolveLabel),
    ),
  };
}

export function buildWorkbenchViewEditorTabs<
  TViewId extends string,
  TSectionId extends string,
  TLabelKey extends string,
  TIcon = unknown,
>({
  dirtyViewIds,
  descriptors,
  openViewIds,
  resolveLabel,
}: {
  descriptors: ReadonlyArray<WorkbenchViewContribution<TViewId, TSectionId, TLabelKey, TIcon>>;
  dirtyViewIds: ReadonlySet<TViewId>;
  openViewIds: ReadonlyArray<TViewId>;
  resolveLabel: (labelKey: TLabelKey) => string;
}): ReadonlyArray<WorkbenchViewEditorTabItem<TViewId, TIcon>> {
  const descriptorById = new Map<
    TViewId,
    WorkbenchViewContribution<TViewId, TSectionId, TLabelKey, TIcon>
  >(descriptors.map((descriptor) => [descriptor.id, descriptor]));

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
  TSectionId extends string,
  TLabelKey extends string,
  TIcon,
>(
  descriptors: ReadonlyArray<WorkbenchViewContribution<TViewId, TSectionId, TLabelKey, TIcon>>,
  sectionId: TSectionId,
  resolveLabel: (labelKey: TLabelKey) => string,
): ReadonlyArray<WorkbenchViewActivityBarItem<TViewId, TIcon>> {
  return descriptors
    .filter((descriptor) => descriptor.activityBarSectionId === sectionId)
    .map((descriptor) => ({
      icon: descriptor.icon,
      id: descriptor.id,
      label: resolveLabel(descriptor.labelKey),
    }));
}
