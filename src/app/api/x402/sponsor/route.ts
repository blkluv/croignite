import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import pino from "pino";
import {
  Contract,
  CronosNetwork,
  Facilitator,
  X402EventType,
} from "@crypto.com/facilitator-client";
import { getAddress, isAddress } from "viem";
import { anyApi } from "convex/server";
import {
  DEV_USDCE_TESTNET_ADDRESS,
  USDCE_MAINNET_ADDRESS,
  X402_NETWORKS,
  X402_VERSION,
} from "@/lib/x402/constants";
import { convexHttpClient } from "@/lib/convex/http";
import { getServerEnv } from "@/lib/env/server";
import { decodeX402PaymentHeader } from "@/lib/x402/paymentHeader.server";
import { x402PreflightLimiter, x402SettleLimiter } from "@/lib/x402/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Env = z.object({
  X402_SELLER_WALLET: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  X402_DEFAULT_AMOUNT: z.string().regex(/^\d+$/).default("1000000"),
  X402_DESCRIPTION: z.string().min(1).default("CroIgnite sponsorship"),
  X402_MAX_TIMEOUT_SECONDS: z.string().regex(/^\d+$/).default("300"),
  X402_NETWORK: z
    .enum([X402_NETWORKS.testnet, X402_NETWORKS.mainnet])
    .default(X402_NETWORKS.testnet),
  LOG_LEVEL: z.string().optional(),
});

const Query = z.object({
  amount: z.string().regex(/^\d+$/).optional(),
  clipId: z.string().min(1).optional(),
});

const Body = z.object({
  postId: z.string().min(1),
  amount: z.string().regex(/^\d+$/),
  creatorId: z.string().min(1),
  sponsorName: z.string().min(1),
  objective: z.string().min(1),
  deliverables: z.array(z.string()).min(1),
  startDateIso: z.string().min(1),
  endDateIso: z.string().min(1),
  disclosure: z.string().min(1).default("Sponsored"),
});

const env = Env.parse(process.env);
const sellerWallet = getAddress(env.X402_SELLER_WALLET);
const maxTimeoutSeconds = Math.max(1, Number(env.X402_MAX_TIMEOUT_SECONDS));
const log = pino({ level: env.LOG_LEVEL ?? "info" });

const network =
  env.X402_NETWORK === X402_NETWORKS.mainnet
    ? CronosNetwork.CronosMainnet
    : CronosNetwork.CronosTestnet;
const assetContract =
  env.X402_NETWORK === X402_NETWORKS.mainnet
    ? Contract.USDCe
    : Contract.DevUSDCe;
const assetAddress =
  env.X402_NETWORK === X402_NETWORKS.mainnet
    ? USDCE_MAINNET_ADDRESS
    : DEV_USDCE_TESTNET_ADDRESS;

const facilitator = new Facilitator({ network });

function json402(
  paymentRequirements: unknown,
  error = "Payment Required",
  invalidReason?: string,
) {
  return NextResponse.json(
    {
      error,
      x402Version: X402_VERSION,
      paymentRequirements,
      invalidReason,
    },
    { status: 402 },
  );
}

function getClientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

function validatePaymentHeader(args: {
  paymentHeader: string;
  paymentRequirements: {
    payTo: string;
    asset: string;
    network: string;
    maxAmountRequired: string;
  };
}) {
  const decoded = decodeX402PaymentHeader(args.paymentHeader);
  const { payload } = decoded;

  if (decoded.network !== args.paymentRequirements.network) {
    throw new Error("Payment network does not match requirements.");
  }
  if (payload.asset.toLowerCase() !== args.paymentRequirements.asset.toLowerCase()) {
    throw new Error("Payment asset does not match requirements.");
  }
  if (payload.to.toLowerCase() !== args.paymentRequirements.payTo.toLowerCase()) {
    throw new Error("Payment recipient does not match requirements.");
  }
  if (payload.value !== args.paymentRequirements.maxAmountRequired) {
    throw new Error("Payment amount does not match requirements.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.validBefore <= now) {
    throw new Error("Payment authorization expired.");
  }
  if (payload.validAfter > now) {
    throw new Error("Payment authorization not yet valid.");
  }

  return decoded;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    await x402PreflightLimiter.consume(ip);
  } catch {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }

  const url = new URL(req.url);
  const { amount, clipId } = Query.parse({
    amount: url.searchParams.get("amount") ?? undefined,
    clipId: url.searchParams.get("clipId") ?? undefined,
  });

  const maxAmountRequired = amount ?? env.X402_DEFAULT_AMOUNT;
  const description = clipId
    ? `${env.X402_DESCRIPTION} (clip ${clipId})`
    : env.X402_DESCRIPTION;

  const paymentRequirements = facilitator.generatePaymentRequirements({
    payTo: sellerWallet,
    asset: assetContract,
    description,
    maxAmountRequired,
    mimeType: "application/json",
    maxTimeoutSeconds,
    resource: clipId ? `clip:${clipId}` : undefined,
  });

  const paymentHeader = req.headers.get("x-payment");

  if (!paymentHeader) {
    return json402(paymentRequirements);
  }

  try {
    validatePaymentHeader({
      paymentHeader,
      paymentRequirements: {
        payTo: paymentRequirements.payTo,
        asset: assetAddress,
        network: paymentRequirements.network,
        maxAmountRequired: paymentRequirements.maxAmountRequired,
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Invalid payment header.";
    return json402(paymentRequirements, "Payment Required", reason);
  }

  const verifyBody = facilitator.buildVerifyRequest(paymentHeader, paymentRequirements);

  const verify = await facilitator.verifyPayment(verifyBody);

  if (!verify.isValid) {
    return json402(
      paymentRequirements,
      "Payment Required",
      verify.invalidReason ?? "Payment verification failed.",
    );
  }

  try {
    await x402SettleLimiter.consume(ip);
  } catch {
    return NextResponse.json(
      { error: "Too many settlement attempts. Please retry shortly." },
      { status: 429 },
    );
  }

  const settle = await facilitator.settlePayment(verifyBody);

  if (settle.event !== X402EventType.PaymentSettled) {
    log.warn({ settle }, "x402 settle failed (demo)");
    return NextResponse.json(
      { error: "Payment settlement failed", reason: settle.error ?? "unknown" },
      { status: 402 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      clipId: clipId ?? null,
      payment: {
        txHash: settle.txHash,
        from: settle.from,
        to: settle.to,
        value: settle.value,
        blockNumber: settle.blockNumber,
        timestamp: settle.timestamp,
        network: settle.network,
      },
    },
    { status: 200 },
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    await x402PreflightLimiter.consume(ip);
  } catch {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }

  const payload = await req.json().catch(() => null);
  const parsed = Body.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid sponsor payload." },
      { status: 400 },
    );
  }

  const {
    postId,
    amount,
    creatorId,
    sponsorName,
    objective,
    deliverables,
    startDateIso,
    endDateIso,
    disclosure,
  } = parsed.data;

  let amountValue: bigint;
  try {
    amountValue = BigInt(amount);
  } catch {
    return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
  }

  if (amountValue <= 0n) {
    return NextResponse.json({ error: "Amount must be greater than zero." }, { status: 400 });
  }

  if (!isAddress(creatorId)) {
    return NextResponse.json(
      { error: "Invalid creator address." },
      { status: 400 },
    );
  }

  const normalizedCreatorId = getAddress(creatorId);

  const post = await convexHttpClient.query(anyApi.posts.get, { postId });
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  if (!isAddress(post.user_id)) {
    return NextResponse.json(
      { error: "Creator wallet missing on post." },
      { status: 400 },
    );
  }
  if (getAddress(post.user_id) !== normalizedCreatorId) {
    return NextResponse.json(
      { error: "Creator does not match post owner." },
      { status: 400 },
    );
  }

  const paymentRequirements = facilitator.generatePaymentRequirements({
    payTo: sellerWallet,
    asset: assetContract,
    description: `${env.X402_DESCRIPTION} for post ${postId}`,
    maxAmountRequired: amountValue.toString(),
    mimeType: "application/json",
    maxTimeoutSeconds,
    resource: `post:${postId}`,
  });

  const paymentHeader = req.headers.get("x-payment");

  if (!paymentHeader) {
    return json402(paymentRequirements);
  }

  let decodedHeader;
  try {
    decodedHeader = validatePaymentHeader({
      paymentHeader,
      paymentRequirements: {
        payTo: paymentRequirements.payTo,
        asset: assetAddress,
        network: paymentRequirements.network,
        maxAmountRequired: paymentRequirements.maxAmountRequired,
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Invalid payment header.";
    return json402(paymentRequirements, "Payment Required", reason);
  }

  const normalizedSponsor = getAddress(decodedHeader.payload.from);
  const existing = await convexHttpClient.query(
    anyApi.x402CampaignReceipts.getBySponsorAndNonce,
    {
      sponsorAddress: normalizedSponsor,
      nonce: decodedHeader.payload.nonce,
    },
  );

  if (existing) {
    return NextResponse.json(
      {
        ok: true,
        alreadySettled: true,
        campaignId: existing._id,
        payment: {
          txHash: existing.txHash,
          from: existing.sponsorAddress,
          to: existing.payTo,
          value: existing.assetsWei,
          blockNumber: existing.blockNumber,
          timestamp: existing.timestampIso,
          network: existing.network,
        },
      },
      { status: 200 },
    );
  }

  const verifyBody = facilitator.buildVerifyRequest(paymentHeader, paymentRequirements);

  const verify = await facilitator.verifyPayment(verifyBody);

  if (!verify.isValid) {
    return json402(
      paymentRequirements,
      `Invalid payment: ${verify.invalidReason ?? "unknown"}`,
    );
  }

  try {
    await x402SettleLimiter.consume(ip);
  } catch {
    return NextResponse.json(
      { error: "Too many settlement attempts. Please retry shortly." },
      { status: 429 },
    );
  }

  const settle = await facilitator.settlePayment(verifyBody);

  if (settle.event !== X402EventType.PaymentSettled) {
    log.warn({ settle }, "x402 settle failed");
    return NextResponse.json(
      { error: "Payment settlement failed", reason: settle.error ?? "unknown" },
      { status: 402 },
    );
  }

  if (!settle.txHash || !settle.from || !settle.to || !settle.value) {
    return NextResponse.json(
      { error: "Settlement response missing required fields." },
      { status: 500 },
    );
  }

  const secret = getServerEnv("CROIGNITE_INTERNAL_WRITE_SECRET");

  const receiptId = await convexHttpClient.mutation(
    anyApi.x402CampaignReceipts.createReceipt,
    {
      secret,
      postId,
      creatorId: normalizedCreatorId,
      sponsorAddress: normalizedSponsor,
      payTo: settle.to,
      assetsWei: settle.value,
      asset: assetAddress,
      network: settle.network,
      nonce: decodedHeader.payload.nonce,
      validBefore: decodedHeader.payload.validBefore,
      txHash: settle.txHash,
      blockNumber: settle.blockNumber,
      timestampIso: settle.timestamp,
      sponsorName,
      objective,
      deliverables,
      startDateIso,
      endDateIso,
      disclosure,
    },
  );

  return NextResponse.json(
    {
      ok: true,
      campaignId: receiptId,
      payment: {
        txHash: settle.txHash,
        from: settle.from,
        to: settle.to,
        value: settle.value,
        blockNumber: settle.blockNumber,
        timestamp: settle.timestamp,
        network: settle.network,
      },
    },
    { status: 200 },
  );
}
