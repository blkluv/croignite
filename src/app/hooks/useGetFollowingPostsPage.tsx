import { convexClient } from "@/lib/convex/client";
import { listFollowingPostsPaginated } from "@/lib/convex/functions";
import type { PostWithProfile } from "@/app/types";

export type FollowingPostsPage = {
  page: PostWithProfile[];
  isDone: boolean;
  continueCursor: string | null;
};

type FollowingPostsPageOptions = {
  wallet: string;
  cursor?: string | null;
  limit?: number;
};

const useGetFollowingPostsPage = async ({
  wallet,
  cursor,
  limit = 6,
}: FollowingPostsPageOptions): Promise<FollowingPostsPage> => {
  try {
    return (await convexClient.query(listFollowingPostsPaginated, {
      wallet,
      paginationOpts: { cursor: cursor ?? null, numItems: limit },
    })) as FollowingPostsPage;
  } catch (error) {
    throw error;
  }
};

export default useGetFollowingPostsPage;
