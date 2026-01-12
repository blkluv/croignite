import { convexClient } from "@/lib/convex/client";
import { createSponsorCampaign } from "@/lib/convex/functions";

type SponsorCampaignInput = {
  postId: string;
  clipHash: string;
  creatorId: string;
  vaultAddress: string;
  sponsorAddress: string;
  assets: string;
  protocolFeeWei: string;
  campaignId: string;
  receiptTokenId: string;
  invoiceReceiptAddress: string;
  txHash: string;
};

const useCreateSponsorCampaign = async (input: SponsorCampaignInput) => {
  return await convexClient.mutation(createSponsorCampaign, input);
};

export default useCreateSponsorCampaign;
