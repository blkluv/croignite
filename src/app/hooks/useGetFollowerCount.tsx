import { convexClient } from "@/lib/convex/client";
import { countFollowers } from "@/lib/convex/functions";

const useGetFollowerCount = async (wallet: string): Promise<number> => {
  try {
    return (await convexClient.query(countFollowers, { wallet })) as number;
  } catch (error) {
    throw error;
  }
};

export default useGetFollowerCount;
