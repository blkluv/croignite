import { convexClient } from "@/lib/convex/client";
import { isFollowing } from "@/lib/convex/functions";

const useIsFollowing = async (
  followerId: string,
  followingId: string,
): Promise<boolean> => {
  try {
    return (await convexClient.query(isFollowing, {
      followerId,
      followingId,
    })) as boolean;
  } catch (error) {
    throw error;
  }
};

export default useIsFollowing;
