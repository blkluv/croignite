import "server-only";

import { z } from "zod";
import {
  X402_NETWORKS,
  X402_SCHEME,
  X402_VERSION,
} from "@/lib/x402/constants";

const addressRegex = /^0x[a-fA-F0-9]{40}$/;
const nonceRegex = /^0x[a-fA-F0-9]{64}$/;
const hexRegex = /^0x[a-fA-F0-9]+$/;

const NumericStringSchema = z.string().regex(/^\d+$/);

const PaymentHeaderSchema = z.object({
  x402Version: z.literal(X402_VERSION),
  scheme: z.literal(X402_SCHEME),
  network: z.enum([X402_NETWORKS.testnet, X402_NETWORKS.mainnet]),
  payload: z.object({
    from: z.string().regex(addressRegex),
    to: z.string().regex(addressRegex),
    value: NumericStringSchema,
    validAfter: z.union([NumericStringSchema, z.number().int().nonnegative()]),
    validBefore: z.union([NumericStringSchema, z.number().int().positive()]),
    nonce: z.string().regex(nonceRegex),
    signature: z.string().regex(hexRegex),
    asset: z.string().regex(addressRegex),
  }),
});

export type DecodedPaymentHeader = z.infer<typeof PaymentHeaderSchema>;

function decodeBase64Json(payload: string) {
  try {
    const raw = Buffer.from(payload, "base64").toString("utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Invalid base64 payment header.");
  }
}

function parseNumeric(input: string | number) {
  const value = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(value)) {
    throw new Error("Invalid numeric value in payment header.");
  }
  return value;
}

export function decodeX402PaymentHeader(paymentHeader: string) {
  const raw = decodeBase64Json(paymentHeader);
  const parsed = PaymentHeaderSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error("Invalid payment header structure.");
  }

  const payload = parsed.data.payload;
  const validAfter = parseNumeric(payload.validAfter);
  const validBefore = parseNumeric(payload.validBefore);

  return {
    ...parsed.data,
    payload: {
      ...payload,
      validAfter,
      validBefore,
    },
  };
}
