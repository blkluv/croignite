import { keccak256, toBytes } from "viem";
import { stableJsonStringify } from "@/lib/utils";

export type CampaignTerms = {
  sponsorName: string;
  objective: string;
  deliverables: string[];
  startDateIso: string;
  endDateIso: string;
  disclosure: "Sponsored";
};

export function hashCampaignTerms(terms: CampaignTerms): `0x${string}` {
  const canonical = stableJsonStringify(terms);
  return keccak256(toBytes(canonical));
}
