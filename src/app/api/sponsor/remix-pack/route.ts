import {
  createPublicClient,
  erc20Abi,
  getAddress,
  http,
  isAddress,
  verifyMessage,
} from "viem";
import { cronosTestnet } from "@/lib/web3/cronos";
import { convexHttpClient } from "@/lib/convex/http";
import { getSponsorCampaignByPostId } from "@/lib/convex/functions";
import { buildSponsorPackMessage } from "@/features/sponsor/message";
import { isSponsorCampaignActive } from "@/features/sponsor/utils";
import {
  X402_ASSET_ADDRESS,
  buildPaywallRequirements,
  json402,
  validatePaywallHeader,
  verifyAndSettlePaywall,
} from "@/lib/x402/paywall";
import { x402PreflightLimiter } from "@/lib/x402/rateLimit";
import type { SponsorCampaign } from "@/app/types";

export const dynamic = "force-dynamic";

const SPONSOR_PACK_PRICE = process.env.X402_SPONSOR_PACK_AMOUNT ?? "250000";

const SPONSOR_PACK = {
  id: "croignite-sponsor-pack-v1",
  name: "CroIgnite Sponsor Pack",
  version: "1.0.0",
  assets: [
    {
      type: "title-card",
      label: "Sponsored intro",
      text: "Sponsored by the CroIgnite community",
      durationSeconds: 2.5,
    },
    {
      type: "lower-third",
      label: "Boost badge",
      text: "Boosted on Cronos",
      durationSeconds: 4,
    },
  ],
  notes: [
    "Drag the lower-third into the timeline after the hook.",
    "Use the sponsored intro for brand-backed clips.",
  ],
};

function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    try {
      await x402PreflightLimiter.consume(ip);
    } catch {
      return new Response("Too many requests. Please try again shortly.", {
        status: 429,
      });
    }

    const body = (await req.json()) as {
      postId?: string;
      address?: string;
      signature?: string;
    };

    const postId = body?.postId?.trim();
    const address = body?.address?.trim();
    const signature = body?.signature?.trim();

    if (!postId || !address || !signature) {
      return new Response("Missing postId, address, or signature.", { status: 400 });
    }

    if (!isAddress(address)) {
      return new Response("Invalid wallet address.", { status: 400 });
    }

    const campaign = (await convexHttpClient.query(getSponsorCampaignByPostId, {
      postId,
    })) as SponsorCampaign | null;

    if (!campaign) {
      return new Response("No sponsor campaign found.", { status: 404 });
    }

    if (!isSponsorCampaignActive(campaign)) {
      return new Response("Sponsor campaign has expired.", { status: 410 });
    }

    if (!isAddress(campaign.vaultAddress)) {
      return new Response("Invalid vault address.", { status: 500 });
    }

    const message = buildSponsorPackMessage(postId);
    const verified = await verifyMessage({
      address: getAddress(address),
      message,
      signature: signature as `0x${string}`,
    });

    if (!verified) {
      return new Response("Invalid signature.", { status: 401 });
    }

    const publicClient = createPublicClient({
      chain: cronosTestnet,
      transport: http(cronosTestnet.rpcUrls.default.http[0]),
    });

    const balance = (await publicClient.readContract({
      address: getAddress(campaign.vaultAddress),
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [getAddress(address)],
    })) as bigint;

    if (balance <= 0n) {
      const paymentHeader = req.headers.get("x-payment");
      const paymentRequirements = buildPaywallRequirements({
        amount: SPONSOR_PACK_PRICE,
        description: "CroIgnite sponsor remix pack",
        resource: `sponsor-pack:${postId}`,
      });

      if (!paymentHeader) {
        return json402(paymentRequirements, "Payment Required");
      }

      try {
        validatePaywallHeader({
          paymentHeader,
          paymentRequirements: {
            payTo: paymentRequirements.payTo,
            asset: X402_ASSET_ADDRESS,
            network: paymentRequirements.network,
            maxAmountRequired: paymentRequirements.maxAmountRequired,
          },
        });
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "Invalid payment header.";
        return json402(paymentRequirements, "Payment Required", reason);
      }

      const settled = await verifyAndSettlePaywall({
        paymentHeader,
        paymentRequirements,
        ip,
      });

      if (!settled.ok) {
        return json402(paymentRequirements, "Payment Required", settled.reason);
      }

      return Response.json({
        pack: SPONSOR_PACK,
        payment: {
          txHash: settled.settle.txHash,
          from: settled.settle.from,
          to: settled.settle.to,
          value: settled.settle.value,
          blockNumber: settled.settle.blockNumber,
          timestamp: settled.settle.timestamp,
          network: settled.settle.network,
        },
      });
    }

    return Response.json({ pack: SPONSOR_PACK });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return new Response(message, { status: 500 });
  }
}
