import { convexClient } from "@/lib/convex/client";
import { deletePost } from "@/lib/convex/functions";

const useDeletePostById = async (postId: string) => {
  try {
    await convexClient.mutation(deletePost, { postId });
    return true;
  } catch (error) {
    throw error;
  }
};

export default useDeletePostById;
