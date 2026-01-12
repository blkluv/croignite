import { convexClient } from "@/lib/convex/client";
import { createLike } from "@/lib/convex/functions";

const useCreateLike = async (userId: string, postId: string) => {
  try {
    return await convexClient.mutation(createLike, { userId, postId });
  } catch (error) {
    throw error;
  }
};

export default useCreateLike;
