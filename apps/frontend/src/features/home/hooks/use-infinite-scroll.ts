import { useEffect, type RefObject } from 'react';

interface UseInfiniteScrollOptions {
  rootRef: RefObject<HTMLDivElement | null>;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onLoadMore: () => void;
  enabled: boolean;
  rootMargin?: string;
}

export function useInfiniteScroll({
  rootRef,
  sentinelRef,
  onLoadMore,
  enabled,
  rootMargin = '0px 300px 0px 0px',
}: UseInfiniteScrollOptions) {
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = rootRef.current;
    if (!sentinel || !root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && enabled) onLoadMore();
      },
      { root, rootMargin },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [rootRef, sentinelRef, onLoadMore, enabled, rootMargin]);
}
