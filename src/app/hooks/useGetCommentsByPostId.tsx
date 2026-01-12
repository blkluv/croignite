import { convexClient } from "@/lib/convex/client";
import { listComments } from "@/lib/convex/functions";
import type { CommentWithProfile } from "@/app/types";

const useGetCommentsByPostId = async (
  postId: string,
): Promise<CommentWithProfile[]> => {
  try {
    return (await convexClient.query(listComments, { postId })) as
      | CommentWithProfile[]
      | [];
  } catch (error) {
    throw error;
  }
};

export default useGetCommentsByPostId;
