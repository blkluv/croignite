import { convexClient } from "@/lib/convex/client";
import { logBoostPassClaim } from "@/lib/convex/functions";

type BoostPassClaimInput = {
  epoch: number;
  wallet: string;
  txHash: string;
};

const useLogBoostPassClaim = async (input: BoostPassClaimInput) => {
  return await convexClient.mutation(logBoostPassClaim, input);
};

export default useLogBoostPassClaim;
