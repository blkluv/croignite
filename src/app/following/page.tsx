"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MainLayout from "@/app/layouts/MainLayout";
import { useUser } from "@/app/context/user";
import type { PostWithProfile } from "@/app/types";
import ClientOnly from "@/app/components/ClientOnly";
import PostMain from "@/app/components/PostMain";
import EmptyState from "@/components/feedback/EmptyState";
import WalletGateSkeleton from "@/components/feedback/WalletGateSkeleton";
import FeedNavButtons from "@/components/layout/FeedNavButtons";
import { useScrollSnapNavigation } from "@/hooks/useScrollSnapNavigation";
import getFollowingPostsPage from "@/app/hooks/useGetFollowingPostsPage";

export default function FollowingPage() {
  const contextUser = useUser();
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const didInitialLoadRef = useRef(false);
  const isFetchingRef = useRef(false);
  const {
    containerRef,
    activeIndex,
    hasNext,
    hasPrev,
    scrollToIndex,
  } = useScrollSnapNavigation({ itemCount: posts.length });

  const loadPage = useCallback(async () => {
    if (!contextUser?.user?.id || isFetchingRef.current || isDone) return;
    isFetchingRef.current = true;
    setStatus("loading");
    try {
      const result = await getFollowingPostsPage({
        wallet: contextUser.user.id,
        cursor,
        limit: 6,
      });
      setPosts((prev) => {
        const seen = new Set(prev.map((post) => post.id));
        const nextPage = result.page.filter((post) => !seen.has(post.id));
        return [...prev, ...nextPage];
      });
      setCursor(result.continueCursor ?? null);
      setIsDone(result.isDone);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      isFetchingRef.current = false;
    }
  }, [contextUser?.user?.id, cursor, isDone]);

  useEffect(() => {
    didInitialLoadRef.current = false;
    if (!contextUser?.user?.id) {
      setStatus("idle");
      setPosts([]);
      setCursor(null);
      setIsDone(false);
      return;
    }
    setPosts([]);
    setCursor(null);
    setIsDone(false);
  }, [contextUser?.user?.id]);

  useEffect(() => {
    if (!contextUser?.user?.id) return;
    if (didInitialLoadRef.current) return;
    didInitialLoadRef.current = true;
    loadPage();
  }, [contextUser?.user?.id, loadPage]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    if (posts.length === 0) return;
    if (!isDone && activeIndex >= Math.max(posts.length - 2, 0)) {
      void loadPage();
    }
  }, [activeIndex, isDone, loadPage, posts.length]);

  const showEmpty = useMemo(
    () => status === "idle" && posts.length === 0,
    [posts.length, status],
  );

  return (
    <MainLayout>
      <div className="mx-auto mt-[60px] h-[calc(100vh-60px)] w-full max-w-[920px] px-4">
        <ClientOnly>
          {!contextUser?.user?.id ? (
            <div className="flex h-full items-center justify-center">
              <WalletGateSkeleton cards={2} className="w-full max-w-xl" />
            </div>
          ) : status === "loading" && posts.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                title="Loading followed clips…"
                description="Hang tight while we pull in your creators."
              />
            </div>
          ) : status === "error" ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                title="Couldn’t load followed clips"
                description="Please try again in a moment."
              />
            </div>
          ) : showEmpty ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                title="No followed clips yet"
                description="Follow a creator from the For You feed to start curating your list."
                secondaryAction={{ label: "Explore For You", href: "/" }}
              />
            </div>
          ) : (
            <div className="relative h-full">
              <div
                ref={containerRef}
                className="feed-scroll h-full overscroll-contain overflow-y-auto snap-y snap-mandatory"
              >
                {posts.map((post, index) => (
                  <PostMain
                    post={post}
                    key={post.id}
                    onAutoAdvance={() => {
                      if (index < posts.length - 1) {
                        scrollToIndex(index + 1);
                      }
                    }}
                  />
                ))}
              </div>
              {posts.length > 1 ? (
                <FeedNavButtons
                  onPrev={() => scrollToIndex(activeIndex - 1)}
                  onNext={() => scrollToIndex(activeIndex + 1)}
                  disablePrev={!hasPrev}
                  disableNext={!hasNext}
                  className="fixed right-6 top-1/2 z-40 -translate-y-1/2"
                />
              ) : null}
            </div>
          )}
        </ClientOnly>
      </div>
    </MainLayout>
  );
}
