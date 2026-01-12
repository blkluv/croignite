import { convexClient } from "@/lib/convex/client";
import { searchProfiles } from "@/lib/convex/functions";
import type { RandomUsers } from "@/app/types";

const useSearchProfilesByName = async (
  query: string,
): Promise<RandomUsers[]> => {
  try {
    return (await convexClient.query(searchProfiles, { query })) as
      | RandomUsers[]
      | [];
  } catch (error) {
    throw error;
  }
};

export default useSearchProfilesByName;
