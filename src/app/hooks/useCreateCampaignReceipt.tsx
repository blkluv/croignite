import { convexClient } from "@/lib/convex/client";
import { createCampaignReceipt } from "@/lib/convex/functions";

type CampaignReceiptInput = {
  postId: string;
  clipHash: string;
  creatorId: string;
  sponsorAddress: string;
  boostVault: string;
  assetsWei: string;
  protocolFeeWei: string;
  campaignId: string;
  receiptTokenId: string;
  invoiceReceiptAddress: string;
  termsHash: string;
  txHash: string;
  sponsorName: string;
  objective: string;
  deliverables: string[];
  startDateIso: string;
  endDateIso: string;
  disclosure: string;
};

const useCreateCampaignReceipt = async (input: CampaignReceiptInput) => {
  return await convexClient.mutation(createCampaignReceipt, input);
};

export default useCreateCampaignReceipt;
