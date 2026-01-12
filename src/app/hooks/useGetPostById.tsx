import { convexClient } from "@/lib/convex/client";
import { getPost } from "@/lib/convex/functions";
import type { PostWithProfile } from "@/app/types";

const useGetPostById = async (postId: string): Promise<PostWithProfile | null> => {
  try {
    return (await convexClient.query(getPost, { postId })) as
      | PostWithProfile
      | null;
  } catch (error) {
    throw error;
  }
};

export default useGetPostById;
