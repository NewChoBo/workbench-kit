import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

const DEFAULT_LOAD_OLDER_ROOT_MARGIN = '160px 0px 0px 0px';

export interface UseChatPrependPaginationOptions {
  getScrollContainer?: ((listElement: HTMLDivElement | null) => HTMLElement | null) | undefined;
  initialVisibleItemCount?: number | undefined;
  isStreaming?: boolean | undefined;
  itemCount: number;
  lastItemId?: string | undefined;
  paginationKey?: string | undefined;
  rootMargin?: string | undefined;
  visibleItemPageSize?: number | undefined;
}

export interface UseChatPrependPaginationResult {
  bottomRef: RefObject<HTMLDivElement | null>;
  displayedItemCount: number;
  displayedStartIndex: number;
  hasOlderItems: boolean;
  hiddenItemCount: number;
  isPaginationEnabled: boolean;
  listRef: RefObject<HTMLDivElement | null>;
  loadOlderItems: () => void;
  topSentinelRef: RefObject<HTMLDivElement | null>;
  visibleItemLimit: number;
}

export function useChatPrependPagination({
  getScrollContainer = defaultChatScrollContainer,
  initialVisibleItemCount,
  isStreaming = false,
  itemCount,
  lastItemId = '',
  paginationKey = '',
  rootMargin = DEFAULT_LOAD_OLDER_ROOT_MARGIN,
  visibleItemPageSize,
}: UseChatPrependPaginationOptions): UseChatPrependPaginationResult {
  const listRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingPrependScrollRef = useRef<{
    scrollHeight: number;
    scrollTop: number;
  } | null>(null);
  const normalizedInitialVisibleItemCount =
    initialVisibleItemCount !== undefined
      ? Math.max(1, Math.floor(initialVisibleItemCount))
      : itemCount;
  const normalizedVisibleItemPageSize = Math.max(
    1,
    Math.floor(visibleItemPageSize ?? normalizedInitialVisibleItemCount),
  );
  const isPaginationEnabled =
    initialVisibleItemCount !== undefined && itemCount > normalizedInitialVisibleItemCount;
  const [pagination, setPagination] = useState({
    key: paginationKey,
    visibleItemLimit: normalizedInitialVisibleItemCount,
  });
  const visibleItemLimit = isPaginationEnabled
    ? pagination.key === paginationKey
      ? pagination.visibleItemLimit
      : normalizedInitialVisibleItemCount
    : itemCount;
  const displayedStartIndex = Math.max(0, itemCount - visibleItemLimit);
  const displayedItemCount = itemCount - displayedStartIndex;
  const hiddenItemCount = displayedStartIndex;
  const hasOlderItems = hiddenItemCount > 0;

  const resolveScrollContainer = useCallback(
    () => getScrollContainer(listRef.current),
    [getScrollContainer],
  );

  const loadOlderItems = useCallback(() => {
    if (!hasOlderItems || pendingPrependScrollRef.current) return;

    const scrollContainer = resolveScrollContainer();
    if (scrollContainer) {
      pendingPrependScrollRef.current = {
        scrollHeight: scrollContainer.scrollHeight,
        scrollTop: scrollContainer.scrollTop,
      };
    }

    setPagination((currentPagination) => {
      const currentLimit =
        currentPagination.key === paginationKey
          ? currentPagination.visibleItemLimit
          : normalizedInitialVisibleItemCount;

      return {
        key: paginationKey,
        visibleItemLimit: Math.min(itemCount, currentLimit + normalizedVisibleItemPageSize),
      };
    });
  }, [
    hasOlderItems,
    itemCount,
    normalizedInitialVisibleItemCount,
    normalizedVisibleItemPageSize,
    paginationKey,
    resolveScrollContainer,
  ]);

  useEffect(() => {
    pendingPrependScrollRef.current = null;
  }, [paginationKey]);

  useEffect(() => {
    if (!isPaginationEnabled || !hasOlderItems) return undefined;

    const scrollContainer = resolveScrollContainer();
    const sentinel = topSentinelRef.current;
    if (!scrollContainer || !sentinel || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          loadOlderItems();
        }
      },
      {
        root: scrollContainer,
        rootMargin,
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasOlderItems, isPaginationEnabled, loadOlderItems, resolveScrollContainer, rootMargin]);

  useLayoutEffect(() => {
    const pendingPrependScroll = pendingPrependScrollRef.current;
    if (pendingPrependScroll) {
      const scrollContainer = resolveScrollContainer();
      if (scrollContainer) {
        scrollContainer.scrollTop =
          scrollContainer.scrollHeight -
          pendingPrependScroll.scrollHeight +
          pendingPrependScroll.scrollTop;
      }

      pendingPrependScrollRef.current = null;
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [displayedItemCount, isStreaming, lastItemId, resolveScrollContainer]);

  return {
    bottomRef,
    displayedItemCount,
    displayedStartIndex,
    hasOlderItems,
    hiddenItemCount,
    isPaginationEnabled,
    listRef,
    loadOlderItems,
    topSentinelRef,
    visibleItemLimit,
  };
}

function defaultChatScrollContainer(listElement: HTMLDivElement | null): HTMLElement | null {
  return listElement?.closest<HTMLElement>('.ui-side-bar-view__body') ?? null;
}
