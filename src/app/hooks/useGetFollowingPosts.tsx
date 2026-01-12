import { convexClient } from "@/lib/convex/client";
import { listFollowingPosts } from "@/lib/convex/functions";
import type { PostWithProfile } from "@/app/types";

const useGetFollowingPosts = async (
  wallet: string,
): Promise<PostWithProfile[]> => {
  try {
    return (await convexClient.query(listFollowingPosts, {
      wallet,
    })) as PostWithProfile[];
  } catch (error) {
    throw error;
  }
};

export default useGetFollowingPosts;
