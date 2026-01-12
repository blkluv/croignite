import "server-only";

import { LRUCache } from "lru-cache";
import { getServerEnv } from "@/lib/env/server";
import { cronos } from "@/lib/web3/cronosConstants";

type JsonRpcOk<T> = { jsonrpc: "2.0"; id: number; result: T };
type JsonRpcErr = {
  jsonrpc: "2.0";
  id: number;
  error: { code: number; message: string };
};

type CronosRpcOptions = {
  cacheTtlMs?: number;
  cacheKey?: string;
};

type CacheEntry = { value: unknown };

const rpcCache = new LRUCache<string, CacheEntry>({ max: 128 });

export async function cronosRpc<T>(
  method: string,
  params: unknown[] = [],
  options: CronosRpcOptions = {},
): Promise<T> {
  const rpcUrl =
    getServerEnv("CRONOS_TESTNET_RPC_URL") ??
    process.env.NEXT_PUBLIC_CRONOS_RPC_URL ??
    cronos.testnet.rpcUrl;

  if (!rpcUrl) {
    throw new Error("Missing Cronos RPC URL.");
  }

  const shouldCache = Boolean(options.cacheTtlMs && options.cacheTtlMs > 0);
  const cacheKey = shouldCache
    ? options.cacheKey ?? `${method}:${JSON.stringify(params)}`
    : null;

  if (shouldCache && cacheKey) {
    const cached = rpcCache.get(cacheKey);
    if (cached !== undefined) {
      return cached.value as T;
    }
  }

  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Cronos RPC HTTP ${res.status}`);
  }

  const payload = (await res.json()) as JsonRpcOk<T> | JsonRpcErr;

  if ("error" in payload) {
    throw new Error(`Cronos RPC error: ${payload.error.message}`);
  }

  if (shouldCache && cacheKey) {
    rpcCache.set(cacheKey, { value: payload.result }, { ttl: options.cacheTtlMs });
  }

  return payload.result;
}
