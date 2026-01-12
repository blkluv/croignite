import { convexClient } from "@/lib/convex/client";
import { listLikedPostsByUser } from "@/lib/convex/functions";
import type { PostWithProfile } from "@/app/types";

const useGetLikedPostsByUserId = async (
  userId: string,
): Promise<PostWithProfile[]> => {
  try {
    return (await convexClient.query(listLikedPostsByUser, {
      userId,
    })) as PostWithProfile[];
  } catch (error) {
    throw error;
  }
};

export default useGetLikedPostsByUserId;
