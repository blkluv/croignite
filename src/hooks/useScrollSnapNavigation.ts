import { useCallback, useEffect, useRef, useState } from "react";

type ScrollSnapConfig = {
  itemCount: number;
  lockDurationMs?: number;
};

export function useScrollSnapNavigation({
  itemCount,
  lockDurationMs = 800,
}: ScrollSnapConfig) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollLockRef = useRef(false);

  const getItemOffset = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container) return null;
    const child = container.children.item(index) as HTMLElement | null;
    if (!child) return null;
    return child.offsetTop;
  }, []);

  const clampIndex = useCallback(
    (index: number) => Math.max(0, Math.min(index, Math.max(itemCount - 1, 0))),
    [itemCount],
  );

  const scrollToIndex = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container) return;
      const nextIndex = clampIndex(index);
      const offset = getItemOffset(nextIndex);
      if (offset == null) return;
      requestAnimationFrame(() => {
        container.scrollTo({
          top: offset,
          behavior: "smooth",
        });
      });
      setActiveIndex(nextIndex);
    },
    [clampIndex, getItemOffset],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (itemCount === 0) {
      setActiveIndex(0);
      container.scrollTo({ top: 0 });
      return;
    }

    if (activeIndex >= itemCount) {
      const clampedIndex = clampIndex(activeIndex);
      setActiveIndex(clampedIndex);
      const offset = getItemOffset(clampedIndex);
      if (offset != null) {
        container.scrollTo({ top: offset });
      }
    }
  }, [activeIndex, clampIndex, getItemOffset, itemCount]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (itemCount <= 1) return;
      if (!container.contains(event.target as Node)) return;
      event.preventDefault();
      if (scrollLockRef.current) return;

      scrollLockRef.current = true;
      const direction = event.deltaY > 0 ? 1 : -1;
      scrollToIndex(activeIndex + direction);

      window.setTimeout(() => {
        scrollLockRef.current = false;
      }, lockDurationMs);
    };

    const handleScroll = () => {
      if (!container) return;
      const nextIndex = Math.round(container.scrollTop / container.clientHeight);
      setActiveIndex(clampIndex(nextIndex));
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", handleWheel, {
      passive: false,
      capture: true,
    });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, [activeIndex, clampIndex, itemCount, lockDurationMs, scrollToIndex]);

  return {
    containerRef,
    activeIndex,
    hasPrev: activeIndex > 0,
    hasNext: activeIndex < Math.max(itemCount - 1, 0),
    scrollToIndex,
  };
}
