import "server-only";

import fs from "node:fs";
import https from "node:https";
import { URL } from "node:url";
import { createClient } from "@crypto.com/ai-agent-client";
import { z } from "zod";

type QueryOptions = Parameters<typeof createClient>[0];
type QueryContext = NonNullable<QueryOptions["context"]>[number];

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  CRONOS_TESTNET_EXPLORER_API_KEY: z.string().min(1),
  CRONOS_CHAIN_ID: z.coerce.number().optional(),
  NEXT_PUBLIC_CRONOS_CHAIN_ID: z.coerce.number().optional(),
  CRONOS_TESTNET_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_CRONOS_TESTNET_RPC_URL: z.string().url().optional(),
  CRONOS_MAINNET_EXPLORER_API_KEY: z.string().optional(),
  CRONOS_ZKEVM_EXPLORER_API_KEY: z.string().optional(),
  CRONOS_ZKEVM_TESTNET_EXPLORER_API_KEY: z.string().optional(),
  CRONOS_AI_AGENT_CA_CERT: z.string().optional(),
  CRONOS_AI_AGENT_INSECURE_TLS: z.string().optional(),
});

const env = EnvSchema.parse(process.env);

const AI_AGENT_URL = new URL(
  "https://ai-agent-api.crypto.com/api/v1/cdc-ai-agent-service/query",
);

type AiAgentResponse = {
  message?: string;
  status?: string;
  hasErrors?: boolean;
  results?: Array<{ message?: string }>;
  context?: QueryContext[];
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export class AiAgentRequestError extends Error {
  status?: number;
  code?: string;
  details?: JsonValue;
  constructor(message: string, options?: { status?: number; code?: string; details?: JsonValue }) {
    super(message);
    this.name = "AiAgentRequestError";
    this.status = options?.status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

function readOptionalCa(path?: string) {
  if (!path) return undefined;
  try {
    return fs.readFileSync(path);
  } catch {
    return undefined;
  }
}

const extraCa = readOptionalCa(env.CRONOS_AI_AGENT_CA_CERT)
  ?? readOptionalCa(process.env.NODE_EXTRA_CA_CERTS);

const allowInsecureFallback =
  process.env.NODE_ENV !== "production" &&
  env.CRONOS_AI_AGENT_INSECURE_TLS === "true";

const tlsRetryCodes = new Set([
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
]);

function extractTlsCode(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const err = error as { code?: string; cause?: { code?: string } };
  return err.code ?? err.cause?.code;
}

async function postAiAgentRequest(
  payload: Record<string, JsonValue>,
  options?: { allowInsecure?: boolean; timeoutMs?: number },
): Promise<AiAgentResponse> {
  const body = JSON.stringify(payload);
  const timeoutMs = options?.timeoutMs ?? 15000;

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        method: "POST",
        hostname: AI_AGENT_URL.hostname,
        path: AI_AGENT_URL.pathname,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body).toString(),
        },
        timeout: timeoutMs,
        ca: extraCa,
        rejectUnauthorized: options?.allowInsecure ? false : true,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let parsed: JsonValue = raw;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch {
            // keep raw text
          }
          if (response.statusCode && response.statusCode >= 400) {
            reject(
              new AiAgentRequestError("AI Agent returned an error response.", {
                status: response.statusCode,
                code: "AI_AGENT_HTTP_ERROR",
                details: parsed,
              }),
            );
            return;
          }
          resolve((parsed ?? {}) as AiAgentResponse);
        });
      },
    );

    request.on("timeout", () => {
      request.destroy(
        new AiAgentRequestError("AI Agent request timed out.", {
          code: "AI_AGENT_TIMEOUT",
        }),
      );
    });

    request.on("error", (err) => reject(err));

    request.write(body);
    request.end();
  });
}

export function getCdcAiAgentOptions(context: QueryContext[] = []) {
  const chainId = env.CRONOS_CHAIN_ID ?? env.NEXT_PUBLIC_CRONOS_CHAIN_ID ?? 338;
  const customRPC =
    env.CRONOS_TESTNET_RPC_URL ?? env.NEXT_PUBLIC_CRONOS_TESTNET_RPC_URL;
  const queryOptions: QueryOptions = {
    openAI: {
      apiKey: env.OPENAI_API_KEY,
      model: "gpt-4o",
    },
    chainId,
    explorerKeys: {
      cronosMainnetKey: env.CRONOS_MAINNET_EXPLORER_API_KEY ?? "",
      cronosTestnetKey: env.CRONOS_TESTNET_EXPLORER_API_KEY,
      cronosZkEvmKey: env.CRONOS_ZKEVM_EXPLORER_API_KEY ?? "",
      cronosZkEvmTestnetKey: env.CRONOS_ZKEVM_TESTNET_EXPLORER_API_KEY ?? "",
    },
    context,
    customRPC,
  };

  return queryOptions;
}

export async function queryCdcAiAgent(prompt: string, context: QueryContext[] = []) {
  const options = getCdcAiAgentOptions(context);
  const payload = { query: prompt, options };

  try {
    return await postAiAgentRequest(payload);
  } catch (error) {
    const tlsCode = extractTlsCode(error);
    if (tlsCode && tlsRetryCodes.has(tlsCode) && allowInsecureFallback) {
      return await postAiAgentRequest(payload, { allowInsecure: true });
    }

    if (tlsCode && tlsRetryCodes.has(tlsCode)) {
      throw new AiAgentRequestError(
        "Unable to verify the Crypto.com AI Agent TLS certificate.",
        { code: "TLS_CERT_ERROR" },
      );
    }

    if (error instanceof AiAgentRequestError) {
      throw error;
    }

    throw new AiAgentRequestError("AI Agent request failed.", {
      code: "AI_AGENT_UNKNOWN_ERROR",
    });
  }
}

export function getCdcAiAgentClient(context: QueryContext[] = []) {
  return createClient(getCdcAiAgentOptions(context));
}

export type { QueryContext };
