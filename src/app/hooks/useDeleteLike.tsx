import { convexClient } from "@/lib/convex/client";
import { removeLike } from "@/lib/convex/functions";

const useDeleteLike = async (postId: string, userId: string) => {
  try {
    return await convexClient.mutation(removeLike, { postId, userId });
  } catch (error) {
    throw error;
  }
};

export default useDeleteLike;
