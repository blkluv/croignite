"use client";

import { useEffect, useState } from "react";
import MainLayout from "@/app/layouts/MainLayout";
import { useUser } from "@/app/context/user";
import getRandomUsers from "@/app/hooks/useGetRandomUsers";
import getFollowingProfiles from "@/app/hooks/useGetFollowingProfiles";
import type { RandomUsers } from "@/app/types";
import MenuItemFollow from "@/app/layouts/includes/MenuItemFollow";
import EmptyState from "@/components/feedback/EmptyState";
import WalletGateSkeleton from "@/components/feedback/WalletGateSkeleton";

const SUGGESTED_LIMIT = 24;
const FOLLOWING_LIMIT = 24;

type LoadStatus = "idle" | "loading" | "ready" | "error";

export default function CreatorsPage() {
  const contextUser = useUser();
  const [suggested, setSuggested] = useState<RandomUsers[]>([]);
  const [following, setFollowing] = useState<RandomUsers[]>([]);
  const [suggestedStatus, setSuggestedStatus] = useState<LoadStatus>("loading");
  const [followingStatus, setFollowingStatus] = useState<LoadStatus>("idle");

  useEffect(() => {
    let isMounted = true;
    setSuggestedStatus("loading");

    const loadSuggested = async () => {
      try {
        const result = await getRandomUsers(SUGGESTED_LIMIT);
        if (!isMounted) return;
        setSuggested(result);
        setSuggestedStatus("ready");
      } catch {
        if (!isMounted) return;
        setSuggestedStatus("error");
      }
    };

    loadSuggested();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const userId = contextUser?.user?.id;
    if (!userId) {
      setFollowing([]);
      setFollowingStatus("idle");
      return;
    }

    let isMounted = true;
    setFollowingStatus("loading");

    const loadFollowing = async () => {
      try {
        const result = await getFollowingProfiles(userId, FOLLOWING_LIMIT);
        if (!isMounted) return;
        setFollowing(result);
        setFollowingStatus("ready");
      } catch {
        if (!isMounted) return;
        setFollowingStatus("error");
      }
    };

    loadFollowing();

    return () => {
      isMounted = false;
    };
  }, [contextUser?.user?.id]);

  return (
    <MainLayout>
      <div className="w-full px-4 pb-24 pt-[100px] lg:pr-0">
        <div className="mx-auto w-full max-w-5xl space-y-10">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold">Creators</h1>
            <p className="text-sm text-muted-foreground">
              Find creators to follow, boost, and sponsor from the CroIgnite community.
            </p>
          </header>

          <section id="suggested" className="space-y-4 scroll-mt-24">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Suggested accounts</h2>
              <p className="text-sm text-muted-foreground">
                Fresh creators recommended from the network.
              </p>
            </div>

            {suggestedStatus === "loading" ? (
              <EmptyState
                title="Loading suggested creators..."
                description="Hang tight while we pull in fresh accounts."
              />
            ) : suggestedStatus === "error" ? (
              <EmptyState
                title="Couldn't load suggested creators"
                description="Please refresh and try again."
              />
            ) : suggested.length === 0 ? (
              <EmptyState
                title="No suggested creators yet"
                description="Check back soon for new accounts to follow."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {suggested.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-[#0f0f12]"
                  >
                    <MenuItemFollow user={user} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="following" className="space-y-4 scroll-mt-24">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Following accounts</h2>
              <p className="text-sm text-muted-foreground">
                Creators you follow for a fast path back to their clips.
              </p>
            </div>

            {!contextUser?.user?.id ? (
              <WalletGateSkeleton cards={2} className="max-w-xl" />
            ) : followingStatus === "loading" ? (
              <EmptyState
                title="Loading followed creators..."
                description="Fetching your creator list."
              />
            ) : followingStatus === "error" ? (
              <EmptyState
                title="Couldn't load following"
                description="Please refresh and try again."
              />
            ) : following.length === 0 ? (
              <EmptyState
                title="No followed creators yet"
                description="Follow a creator from the feed to see them here."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {following.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-[#0f0f12]"
                  >
                    <MenuItemFollow user={user} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
