import { convexClient } from "@/lib/convex/client";
import { countFollowing } from "@/lib/convex/functions";

const useGetFollowingCount = async (wallet: string): Promise<number> => {
  try {
    return (await convexClient.query(countFollowing, { wallet })) as number;
  } catch (error) {
    throw error;
  }
};

export default useGetFollowingCount;
