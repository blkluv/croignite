import { convexClient } from "@/lib/convex/client";
import { listLikes } from "@/lib/convex/functions";
import type { Like } from "@/app/types";

const useGetLikesByPostId = async (postId: string): Promise<Like[]> => {
  try {
    return (await convexClient.query(listLikes, { postId })) as Like[];
  } catch (error) {
    throw error;
  }
};

export default useGetLikesByPostId;
