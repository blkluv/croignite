import { convexClient } from "@/lib/convex/client";
import { removeComment } from "@/lib/convex/functions";

const useDeleteComment = async (commentId: string) => {
  try {
    return await convexClient.mutation(removeComment, { commentId });
  } catch (error) {
    throw error;
  }
};

export default useDeleteComment;
