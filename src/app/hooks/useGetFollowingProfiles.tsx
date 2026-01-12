import { convexClient } from "@/lib/convex/client";
import { listFollowingProfiles } from "@/lib/convex/functions";
import type { RandomUsers } from "@/app/types";

const useGetFollowingProfiles = async (
  wallet: string,
  limit?: number,
): Promise<RandomUsers[]> => {
  try {
    return (await convexClient.query(listFollowingProfiles, {
      wallet,
      limit,
    })) as RandomUsers[];
  } catch (error) {
    throw error;
  }
};

export default useGetFollowingProfiles;
