import type { SponsorCampaign } from "@/app/types";

export const SPONSOR_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function isSponsorCampaignActive(
  campaign: SponsorCampaign | null,
  now = Date.now(),
) {
  if (!campaign) return false;
  return now - campaign.createdAt <= SPONSOR_WINDOW_MS;
}
