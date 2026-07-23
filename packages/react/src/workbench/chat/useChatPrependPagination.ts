import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

import {
  isWorkbenchChatScrollContainerAtBottom,
  resolveWorkbenchChatScrollContainer,
  WORKBENCH_CHAT_LOAD_OLDER_ROOT_MARGIN,
  WORKBENCH_CHAT_SCROLL_BOTTOM_THRESHOLD,
} from './chatScroll';

export interface UseChatPrependPaginationOptions {
  autoScrollBottomThreshold?: number;
  getScrollContainer?: (listElement: HTMLDivElement | null) => HTMLElement | null;
  initialVisibleItemCount?: number;
  isStreaming?: boolean;
  itemCount: number;
  lastItemId?: string;
  /** Content revision for the trailing item (e.g. streaming chunk updates). */
  lastItemRevision?: string;
  paginationKey?: string;
  rootMargin?: string;
  /**
   * - `true` (default): always scroll to the latest message
   * - `'auto'`: scroll only when the container is already near the bottom
   * - `false`: never auto-scroll
   */
  stickToBottom?: boolean | 'auto';
  visibleItemPageSize?: number;
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
  autoScrollBottomThreshold = WORKBENCH_CHAT_SCROLL_BOTTOM_THRESHOLD,
  getScrollContainer = resolveWorkbenchChatScrollContainer,
  initialVisibleItemCount,
  isStreaming = false,
  itemCount,
  lastItemId = '',
  lastItemRevision = '',
  paginationKey = '',
  rootMargin = WORKBENCH_CHAT_LOAD_OLDER_ROOT_MARGIN,
  stickToBottom = true,
  visibleItemPageSize,
}: UseChatPrependPaginationOptions): UseChatPrependPaginationResult {
  const listRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingPrependScrollRef = useRef<{
    scrollHeight: number;
    scrollTop: number;
  } | null>(null);
  const shouldStickToBottomRef = useRef(true);
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
    shouldStickToBottomRef.current = true;
  }, [paginationKey]);

  useEffect(() => {
    if (stickToBottom !== 'auto' || itemCount === 0) return undefined;

    const scrollContainer = resolveScrollContainer();
    if (!scrollContainer) return undefined;

    const updateShouldStickToBottom = () => {
      shouldStickToBottomRef.current = isWorkbenchChatScrollContainerAtBottom({
        bottomThreshold: autoScrollBottomThreshold,
        clientHeight: scrollContainer.clientHeight,
        scrollHeight: scrollContainer.scrollHeight,
        scrollTop: scrollContainer.scrollTop,
      });
    };

    updateShouldStickToBottom();
    scrollContainer.addEventListener('scroll', updateShouldStickToBottom, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', updateShouldStickToBottom);
    };
  }, [autoScrollBottomThreshold, itemCount, paginationKey, resolveScrollContainer, stickToBottom]);

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

        if (stickToBottom === 'auto') {
          shouldStickToBottomRef.current = isWorkbenchChatScrollContainerAtBottom({
            bottomThreshold: autoScrollBottomThreshold,
            clientHeight: scrollContainer.clientHeight,
            scrollHeight: scrollContainer.scrollHeight,
            scrollTop: scrollContainer.scrollTop,
          });
        }
      }

      pendingPrependScrollRef.current = null;
      return;
    }

    if (stickToBottom === false) {
      return;
    }

    if (stickToBottom === 'auto' && !shouldStickToBottomRef.current) {
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [
    autoScrollBottomThreshold,
    displayedItemCount,
    isStreaming,
    lastItemId,
    lastItemRevision,
    resolveScrollContainer,
    stickToBottom,
  ]);

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
