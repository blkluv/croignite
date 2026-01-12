import { convexClient } from "@/lib/convex/client";
import { getLatestBoostPassEpoch } from "@/lib/convex/functions";
import type { BoostPassEpoch } from "@/app/types";

const useGetLatestBoostPassEpoch = async (): Promise<BoostPassEpoch | null> => {
  return (await convexClient.query(getLatestBoostPassEpoch, {})) as
    | BoostPassEpoch
    | null;
};

export default useGetLatestBoostPassEpoch;
