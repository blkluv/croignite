import { convexClient } from "@/lib/convex/client";
import { logBoostPassEpoch } from "@/lib/convex/functions";

type BoostPassEpochInput = {
  epoch: number;
  publishedBy: string;
  txHash: string;
  topWallets: string[];
};

const useLogBoostPassEpoch = async (input: BoostPassEpochInput) => {
  return await convexClient.mutation(logBoostPassEpoch, input);
};

export default useLogBoostPassEpoch;
