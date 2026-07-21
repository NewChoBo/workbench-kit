export const WORKBENCH_CHAT_SCROLL_BOTTOM_THRESHOLD = 72;
export const WORKBENCH_CHAT_LOAD_OLDER_ROOT_MARGIN = '160px 0px 0px 0px';

export function resolveWorkbenchChatScrollContainer(
  listElement: HTMLDivElement | null,
): HTMLElement | null {
  return listElement?.closest<HTMLElement>('.ui-sidebar-view__body') ?? null;
}

export function isWorkbenchChatScrollContainerAtBottom({
  bottomThreshold = WORKBENCH_CHAT_SCROLL_BOTTOM_THRESHOLD,
  clientHeight,
  scrollHeight,
  scrollTop,
}: {
  bottomThreshold?: number;
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
}): boolean {
  return scrollHeight - clientHeight - scrollTop <= bottomThreshold;
}
