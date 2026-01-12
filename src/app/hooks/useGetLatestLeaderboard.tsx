import { convexClient } from "@/lib/convex/client";
import { getLatestLeaderboard } from "@/lib/convex/functions";
import type { LeaderboardSnapshot } from "@/app/types";

const useGetLatestLeaderboard = async (): Promise<LeaderboardSnapshot | null> => {
  return (await convexClient.query(getLatestLeaderboard, {})) as
    | LeaderboardSnapshot
    | null;
};

export default useGetLatestLeaderboard;
