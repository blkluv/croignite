import { convexClient } from "@/lib/convex/client";
import { createComment } from "@/lib/convex/functions";

const useCreateComment = async (
  userId: string,
  postId: string,
  text: string,
) => {
  try {
    return await convexClient.mutation(createComment, {
      userId,
      postId,
      text,
    });
  } catch (error) {
    throw error;
  }
};

export default useCreateComment;
