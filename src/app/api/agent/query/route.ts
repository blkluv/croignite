import { z } from "zod";
import { RateLimiterMemory } from "rate-limiter-flexible";
import {
  AiAgentRequestError,
  queryCdcAiAgent,
  type QueryContext,
} from "@/lib/cryptoCom/aiAgent";
import {
  extractEvmAddresses,
  normalizeEvmAddressesInText,
} from "@/lib/web3/address";
import {
  X402_ASSET_ADDRESS,
  buildPaywallRequirements,
  json402,
  validatePaywallHeader,
  verifyAndSettlePaywall,
} from "@/lib/x402/paywall";
import { x402PreflightLimiter } from "@/lib/x402/rateLimit";

export const runtime = "nodejs";

const limiter = new RateLimiterMemory({
  points: 20,
  duration: 60,
});

const ContextSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(2000),
});

const BodySchema = z.object({
  prompt: z.string().min(1).max(4000),
  context: z.array(ContextSchema).max(25).optional(),
  pro: z.boolean().optional(),
});

const ADDRESS_PLACEHOLDER_REGEX = /0x\.\.\./i;
const WALLET_ACTIVITY_KEYWORDS = [
  "wallet activity",
  "transactions",
  "transaction history",
  "transfers",
  "txs",
  "tx list",
  "token transfers",
];
const CRONOS_EXPLORER_API_BASE =
  process.env.CRONOS_EXPLORER_API_BASE ??
  process.env.NEXT_PUBLIC_CRONOS_EXPLORER_API_BASE ??
  "https://cronos.org/explorer/testnet3/api";
const CRONOS_EXPLORER_BASE =
  process.env.NEXT_PUBLIC_CRONOS_EXPLORER_BASE ??
  "https://explorer.cronos.org/testnet";
const USDCE_ADDRESS =
  process.env.NEXT_PUBLIC_CRONOS_USDCE_ADDRESS ??
  "0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0";

function isInvalidAddressMessage(message: string) {
  return /invalid address format/i.test(message);
}

type BlockscoutTx = {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  contractAddress?: string;
  tokenSymbol?: string;
  tokenDecimal?: string;
};

function isWalletActivityQuery(prompt: string) {
  const lowered = prompt.toLowerCase();
  return WALLET_ACTIVITY_KEYWORDS.some((keyword) => lowered.includes(keyword));
}

function formatUnits(value: bigint, decimals: number) {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  const fractionStr = fraction.toString().padStart(decimals, "0").slice(0, 4);
  return `${whole.toString()}.${fractionStr}`;
}

async function fetchBlockscoutTxs(
  address: string,
  action: "txlist" | "tokentx",
  limit = 10,
): Promise<BlockscoutTx[] | null> {
  const params = new URLSearchParams({
    module: "account",
    action,
    address,
    page: "1",
    offset: String(limit),
    sort: "desc",
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${CRONOS_EXPLORER_API_BASE}?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status?: string;
      message?: string;
      result?: BlockscoutTx[] | string;
    };
    if (json?.status !== "1" || !Array.isArray(json.result)) {
      return [];
    }
    return json.result;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function buildWalletActivitySummary(address: string) {
  const [nativeTxs, tokenTxs] = await Promise.all([
    fetchBlockscoutTxs(address, "txlist", 8),
    fetchBlockscoutTxs(address, "tokentx", 8),
  ]);

  if (!nativeTxs || !tokenTxs) {
    return {
      ok: false,
      message:
        "The Cronos explorer API is not responding right now. Please try again in a moment.",
    };
  }

  const latestNative = nativeTxs[0];
  const latestToken = tokenTxs[0];
  const usdceAddress = USDCE_ADDRESS.toLowerCase();
  const usdceTxs = tokenTxs.filter(
    (tx) => (tx.contractAddress ?? "").toLowerCase() === usdceAddress,
  );
  const usdceTotal = usdceTxs.reduce((sum, tx) => {
    try {
      return sum + BigInt(tx.value ?? "0");
    } catch {
      return sum;
    }
  }, 0n);
  const usdceHuman = usdceTotal > 0n ? formatUnits(usdceTotal, 6) : "0";
  const explorerBase = CRONOS_EXPLORER_BASE.replace(/\/$/, "");
  const explorerLink = latestNative?.hash
    ? `${explorerBase}/tx/${latestNative.hash}`
    : `${explorerBase}/address/${address}`;

  const summary = [
    `Here’s a quick summary for ${address} on Cronos testnet:`,
    `• Recent native transactions: ${nativeTxs.length}`,
    `• Recent token transfers: ${tokenTxs.length} (${usdceTxs.length} devUSDC.e)`,
    `• devUSDC.e moved in last ${usdceTxs.length} txs: ${usdceHuman} devUSDC.e`,
    latestNative
      ? `• Latest native tx: ${latestNative.hash} → ${explorerLink}`
      : `• Explorer: ${explorerLink}`,
    latestToken ? `• Latest token tx: ${latestToken.hash}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return { ok: true, message: summary };
}

function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

function formatAgentResponse(response: unknown) {
  if (typeof response === "string") {
    return response.trim() || "No response returned.";
  }

  if (!response || typeof response !== "object") {
    return "No response returned.";
  }

  const record = response as {
    message?: string;
    results?: Array<{ message?: string; data?: any }>;
    result?: { message?: string };
    data?: { message?: string; response?: { message?: string }; answer?: string };
    object?: { message?: string; response?: { message?: string }; answer?: string };
    answer?: string;
    status?: string;
  };

  const results = record.results ?? [];
  const messages = results
    .map((item) => {
      if (item?.message) return item.message.trim();
      if (item?.data?.message) return String(item.data.message).trim();
      if (item?.data?.response?.message) return String(item.data.response.message).trim();
      if (item?.data?.answer) return String(item.data.answer).trim();
      return "";
    })
    .filter(Boolean);

  if (messages.length > 0) {
    return messages.join("\n\n");
  }

  const fallbackCandidates = [
    record.message,
    record.result?.message,
    record.data?.message,
    record.data?.response?.message,
    record.data?.answer,
    record.object?.message,
    record.object?.response?.message,
    record.object?.answer,
    record.answer,
  ]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  if (fallbackCandidates.length > 0) {
    return fallbackCandidates[0]!;
  }

  if (record.status) {
    return `The AI agent responded with status "${record.status}". Try a more specific prompt.`;
  }

  return "The AI agent did not return a message.";
}

export async function POST(req: Request) {
  const ip = getClientIp(req);

  try {
    await limiter.consume(ip);
  } catch {
    return Response.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { prompt, context, pro } = parsed.data;
  if (ADDRESS_PLACEHOLDER_REGEX.test(prompt)) {
    return Response.json({
      answer:
        "Please provide the full Cronos address (0x...) so I can summarize wallet activity.",
      status: "needs_address",
      hasErrors: false,
      context: context ?? [],
    });
  }

  let settledPayment:
    | {
        txHash?: string;
        from?: string;
        to?: string;
        value?: string;
        blockNumber?: number;
        timestamp?: string;
        network?: string;
      }
    | null = null;

  if (pro) {
    try {
      await x402PreflightLimiter.consume(ip);
    } catch {
      return Response.json(
        { error: "Too many requests. Please wait a minute and try again." },
        { status: 429 },
      );
    }

    const paymentHeader = req.headers.get("x-payment");
    const paymentRequirements = buildPaywallRequirements({
      amount: process.env.X402_IGNITE_PRO_AMOUNT ?? "150000",
      description: "CroIgnite Copilot Pro query",
      resource: "ignite:pro",
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

    settledPayment = {
      txHash: settled.settle.txHash,
      from: settled.settle.from,
      to: settled.settle.to,
      value: settled.settle.value,
      blockNumber: settled.settle.blockNumber,
      timestamp: settled.settle.timestamp,
      network: settled.settle.network,
    };
  }

  const normalizedPrompt = normalizeEvmAddressesInText(prompt);
  const normalizedContext = (context ?? []).map((item) => ({
    ...item,
    content: normalizeEvmAddressesInText(item.content),
  }));
  const checksumAddresses = extractEvmAddresses(normalizedPrompt);
  const needsWalletSummary =
    checksumAddresses.length > 0 && isWalletActivityQuery(normalizedPrompt);

  if (needsWalletSummary) {
    const summary = await buildWalletActivitySummary(checksumAddresses[0]!);
    return Response.json({
      answer: summary.message,
      status: summary.ok ? "ok" : "explorer_unavailable",
      hasErrors: !summary.ok,
      payment: settledPayment,
      context: normalizedContext,
    });
  }

  try {
    const response = await queryCdcAiAgent(
      normalizedPrompt,
      normalizedContext as QueryContext[],
    );

    const answer = formatAgentResponse(response);
    const hasMessage = !/^no response returned\.$/i.test(answer.trim()) &&
      !/did not return a message/i.test(answer);

    if (checksumAddresses.length > 0 && isInvalidAddressMessage(answer)) {
      return Response.json({
        answer:
          "That address looks valid, but the AI agent tool rejected it. Please double-check the address and try again.",
        status: "invalid_address",
        hasErrors: true,
        context: response?.context ?? [],
      });
    }

    if ((response?.hasErrors || response?.status === "Failed") && !hasMessage) {
      return Response.json(
        {
          error: response?.message ?? "AI agent returned an error.",
          response,
        },
        { status: 502 },
      );
    }

    return Response.json({
      answer,
      status: response?.status ?? "unknown",
      hasErrors: response?.hasErrors ?? false,
      warning:
        response?.hasErrors
          ? "The AI agent reported a tool error, but a message was still returned."
          : null,
      payment: settledPayment,
      context: response?.context ?? [],
    });
  } catch (error) {
    console.error("[/api/agent/query] error", error);

    if (error instanceof AiAgentRequestError) {
      const hint =
        error.code === "TLS_CERT_ERROR"
          ? "If you're behind a corporate proxy, set NODE_EXTRA_CA_CERTS or CRONOS_AI_AGENT_CA_CERT to the proxy CA file. For local dev only, you can set CRONOS_AI_AGENT_INSECURE_TLS=true."
          : error.code === "AI_AGENT_HTTP_ERROR"
            ? "Double-check your OpenAI API key and Cronos explorer API key in .env.local."
            : undefined;

      return Response.json(
        {
          error: error.message,
          code: error.code ?? "AI_AGENT_ERROR",
          details: error.details ?? null,
          hint,
        },
        { status: error.code === "TLS_CERT_ERROR" ? 502 : 500 },
      );
    }

    return Response.json(
      {
        error: "AI Agent request failed.",
        code: "AI_AGENT_UNKNOWN_ERROR",
      },
      { status: 500 },
    );
  }
}
