import "server-only";

import { z } from "zod";
import {
  Contract,
  CronosNetwork,
  Facilitator,
  X402EventType,
} from "@crypto.com/facilitator-client";
import { getAddress } from "viem";
import {
  DEV_USDCE_TESTNET_ADDRESS,
  USDCE_MAINNET_ADDRESS,
  X402_NETWORKS,
  X402_VERSION,
} from "@/lib/x402/constants";
import { decodeX402PaymentHeader } from "@/lib/x402/paymentHeader.server";
import { x402SettleLimiter } from "@/lib/x402/rateLimit";

const Env = z.object({
  X402_SELLER_WALLET: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  X402_NETWORK: z
    .enum([X402_NETWORKS.testnet, X402_NETWORKS.mainnet])
    .default(X402_NETWORKS.testnet),
  X402_MAX_TIMEOUT_SECONDS: z.string().regex(/^\d+$/).default("300"),
  X402_DESCRIPTION: z.string().min(1).default("CroIgnite x402 payment"),
});

const env = Env.parse(process.env);
const sellerWallet = getAddress(env.X402_SELLER_WALLET);
const maxTimeoutSeconds = Math.max(1, Number(env.X402_MAX_TIMEOUT_SECONDS));

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

export type PaywallRequirementsInput = {
  amount: string;
  description?: string;
  resource?: string;
  mimeType?: string;
};

export function buildPaywallRequirements(input: PaywallRequirementsInput) {
  const description = input.description ?? env.X402_DESCRIPTION;
  return facilitator.generatePaymentRequirements({
    payTo: sellerWallet,
    asset: assetContract,
    description,
    maxAmountRequired: input.amount,
    mimeType: input.mimeType ?? "application/json",
    maxTimeoutSeconds,
    resource: input.resource,
  });
}

export function validatePaywallHeader(args: {
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

export async function verifyAndSettlePaywall(args: {
  paymentHeader: string;
  paymentRequirements: ReturnType<typeof buildPaywallRequirements>;
  ip?: string;
}) {
  const { paymentHeader, paymentRequirements, ip } = args;

  const verifyBody = facilitator.buildVerifyRequest(
    paymentHeader,
    paymentRequirements,
  );

  const verify = await facilitator.verifyPayment(verifyBody);

  if (!verify.isValid) {
    return {
      ok: false,
      status: 402 as const,
      reason: verify.invalidReason ?? "Payment verification failed.",
    };
  }

  if (ip) {
    try {
      await x402SettleLimiter.consume(ip);
    } catch {
      return {
        ok: false,
        status: 429 as const,
        reason: "Too many settlement attempts. Please retry shortly.",
      };
    }
  }

  const settle = await facilitator.settlePayment(verifyBody);

  if (settle.event !== X402EventType.PaymentSettled) {
    return {
      ok: false,
      status: 402 as const,
      reason: settle.error ?? "Payment settlement failed.",
    };
  }

  return {
    ok: true,
    status: 200 as const,
    settle,
  };
}

export function json402(
  paymentRequirements: unknown,
  error = "Payment Required",
  invalidReason?: string,
) {
  return new Response(
    JSON.stringify({
      error,
      x402Version: X402_VERSION,
      paymentRequirements,
      invalidReason,
    }),
    {
      status: 402,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export const X402_ASSET_ADDRESS = assetAddress;
