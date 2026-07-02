import { useEffect, useRef, type RefObject } from 'react';

const DEFAULT_ROOT_MARGIN = '0px 0px 120px 0px';

export interface UseScrollAreaInfiniteLoadOptions {
  enabled?: boolean | undefined;
  hasMore: boolean;
  isLoading?: boolean | undefined;
  isLoadingMore?: boolean | undefined;
  onLoadMore: () => void | Promise<void>;
  rootMargin?: string | undefined;
  scrollAreaRef?: RefObject<HTMLElement | null> | undefined;
}

export interface UseScrollAreaInfiniteLoadResult {
  sentinelRef: RefObject<HTMLDivElement | null>;
}

export function useScrollAreaInfiniteLoad({
  enabled = true,
  hasMore,
  isLoading = false,
  isLoadingMore = false,
  onLoadMore,
  rootMargin = DEFAULT_ROOT_MARGIN,
  scrollAreaRef,
}: UseScrollAreaInfiniteLoadOptions): UseScrollAreaInfiniteLoadResult {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreInFlightRef = useRef(false);
  const onLoadMoreRef = useRef(onLoadMore);
  const hasMoreRef = useRef(hasMore);
  const isLoadingRef = useRef(isLoading);
  const isLoadingMoreRef = useRef(isLoadingMore);

  onLoadMoreRef.current = onLoadMore;
  hasMoreRef.current = hasMore;
  isLoadingRef.current = isLoading;
  isLoadingMoreRef.current = isLoadingMore;

  useEffect(() => {
    if (!enabled || !hasMore || isLoading || isLoadingMore) {
      return undefined;
    }

    const scrollContainer =
      scrollAreaRef?.current ??
      sentinelRef.current?.closest('.ui-scroll-area') ??
      sentinelRef.current?.parentElement;
    const sentinel = sentinelRef.current;

    if (!scrollContainer || !sentinel || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          !entry?.isIntersecting ||
          loadMoreInFlightRef.current ||
          !hasMoreRef.current ||
          isLoadingRef.current ||
          isLoadingMoreRef.current
        ) {
          return;
        }

        loadMoreInFlightRef.current = true;
        void Promise.resolve(onLoadMoreRef.current()).finally(() => {
          loadMoreInFlightRef.current = false;
        });
      },
      {
        root: scrollContainer,
        rootMargin,
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, hasMore, isLoading, isLoadingMore, rootMargin, scrollAreaRef]);

  return { sentinelRef };
}
