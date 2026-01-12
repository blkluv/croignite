import { convexClient } from "@/lib/convex/client";
import { getCampaignReceipt, getX402CampaignReceipt } from "@/lib/convex/functions";
import type { CampaignReceiptView } from "@/app/types";

const useGetCampaignReceiptById = async (
  campaignId: string,
): Promise<CampaignReceiptView | null> => {
  if (!campaignId) return null;
  let onchain: CampaignReceiptView["receipt"] | null = null;
  try {
    onchain = (await convexClient.query(getCampaignReceipt, {
      campaignId,
    })) as CampaignReceiptView["receipt"] | null;
  } catch {
    onchain = null;
  }

  if (onchain) {
    return { type: "onchain", receipt: onchain };
  }

  let x402: CampaignReceiptView["receipt"] | null = null;
  try {
    x402 = (await convexClient.query(getX402CampaignReceipt, {
      receiptId: campaignId,
    })) as CampaignReceiptView["receipt"] | null;
  } catch {
    x402 = null;
  }

  if (x402) {
    return { type: "x402", receipt: x402 };
  }

  return null;
};

export default useGetCampaignReceiptById;
