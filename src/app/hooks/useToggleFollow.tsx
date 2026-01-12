import { convexClient } from "@/lib/convex/client";
import { toggleFollow } from "@/lib/convex/functions";

const useToggleFollow = async (
  followerId: string,
  followingId: string,
): Promise<boolean> => {
  try {
    return (await convexClient.mutation(toggleFollow, {
      followerId,
      followingId,
    })) as boolean;
  } catch (error) {
    throw error;
  }
};

export default useToggleFollow;
