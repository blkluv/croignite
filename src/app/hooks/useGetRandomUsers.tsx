import { convexClient } from "@/lib/convex/client";
import { listRandomProfiles } from "@/lib/convex/functions";
import type { RandomUsers } from "@/app/types";

const useGetRandomUsers = async (limit = 6): Promise<RandomUsers[]> => {
  try {
    return (await convexClient.query(listRandomProfiles, { limit })) as
      | RandomUsers[]
      | [];
  } catch (error) {
    throw error;
  }
};

export default useGetRandomUsers;
