import { convexClient } from "@/lib/convex/client";
import { getCampaignReceipt, getX402CampaignReceipt } from "@/lib/convex/functions";
import type {
  CampaignReceipt,
  CampaignReceiptView,
  X402CampaignReceipt,
} from "@/app/types";

const useGetCampaignReceiptById = async (
  campaignId: string,
): Promise<CampaignReceiptView | null> => {
  if (!campaignId) return null;
  let onchain: CampaignReceipt | null = null;
  try {
    onchain = (await convexClient.query(getCampaignReceipt, {
      campaignId,
    })) as CampaignReceipt | null;
  } catch {
    onchain = null;
  }

  if (onchain) {
    return { type: "onchain", receipt: onchain };
  }

  let x402: X402CampaignReceipt | null = null;
  try {
    x402 = (await convexClient.query(getX402CampaignReceipt, {
      receiptId: campaignId,
    })) as X402CampaignReceipt | null;
  } catch {
    x402 = null;
  }

  if (x402) {
    return { type: "x402", receipt: x402 };
  }

  return null;
};

export default useGetCampaignReceiptById;
