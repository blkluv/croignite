import { convexClient } from "@/lib/convex/client";
import { getSponsorCampaignByPostId } from "@/lib/convex/functions";
import type { SponsorCampaign } from "@/app/types";

const useGetSponsorCampaignByPostId = async (
  postId: string,
): Promise<SponsorCampaign | null> => {
  if (!postId) return null;
  return (await convexClient.query(getSponsorCampaignByPostId, {
    postId,
  })) as SponsorCampaign | null;
};

export default useGetSponsorCampaignByPostId;
