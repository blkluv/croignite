import { NextResponse } from "next/server";
import { z } from "zod";
import { createPublicClient, getAddress, http, isAddress, zeroAddress } from "viem";
import { anyApi } from "convex/server";
import { convexHttpClient } from "@/lib/convex/http";
import { getServerEnv } from "@/lib/env/server";
import { cronosTestnet } from "@/lib/web3/cronos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  wallet: z.string().min(1),
});

type ResolveResponse = {
  ok: boolean;
  walletAddress?: string;
  vault?: string | null;
  txHash?: string | null;
  reason?: string;
};

const factoryAbi = [
  {
    type: "function",
    name: "vaultOf",
    stateMutability: "view",
    inputs: [{ name: "creator", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

function resolveRpcUrl() {
  return (
    getServerEnv("CRONOS_TESTNET_RPC_URL") ??
    cronosTestnet.rpcUrls.default.http[0]
  );
}

function resolveBoostFactoryAddress() {
  const value =
    getServerEnv("BOOST_FACTORY_ADDRESS") ??
    getServerEnv("NEXT_PUBLIC_BOOST_FACTORY_ADDRESS");
  if (!value || !isAddress(value)) {
    return undefined;
  }
  return getAddress(value);
}

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "Missing wallet address." } satisfies ResolveResponse,
      { status: 400 },
    );
  }

  const wallet = parsed.data.wallet;
  if (!isAddress(wallet)) {
    return NextResponse.json(
      { ok: false, reason: "Invalid wallet address." } satisfies ResolveResponse,
      { status: 400 },
    );
  }

  const walletAddress = getAddress(wallet);
  const publicClient = createPublicClient({
    chain: cronosTestnet,
    transport: http(resolveRpcUrl()),
  });

  const existing = await convexHttpClient.query(
    anyApi.creatorVaults.getByWallet,
    { wallet: walletAddress },
  );

  const existingVault =
    existing?.vault && isAddress(existing.vault)
      ? getAddress(existing.vault)
      : null;

  const factoryAddress = resolveBoostFactoryAddress();
  const syncSecret = getServerEnv("CROIGNITE_INTERNAL_WRITE_SECRET");
  let onchainVault: string | null = null;
  let onchainReadFailed = false;

  if (factoryAddress) {
    try {
      onchainVault = (await publicClient.readContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: "vaultOf",
        args: [walletAddress],
      })) as string;
    } catch {
      onchainReadFailed = true;
    }
  }

  if (factoryAddress && onchainVault && onchainVault !== zeroAddress) {
    const normalizedVault = getAddress(onchainVault);
    if (!existing || getAddress(existing.vault) !== normalizedVault) {
      await convexHttpClient.mutation(anyApi.creatorVaults.upsertVaultFromServer, {
        wallet: walletAddress,
        vault: normalizedVault,
        txHash: existing?.txHash ?? null,
        secret: syncSecret,
      });
    }

    return NextResponse.json({
      ok: true,
      walletAddress,
      vault: normalizedVault,
      txHash: existing?.txHash ?? null,
    } satisfies ResolveResponse);
  }

  if (existingVault && (!factoryAddress || onchainReadFailed)) {
    return NextResponse.json({
      ok: true,
      walletAddress,
      vault: existingVault,
      txHash: existing?.txHash ?? null,
    } satisfies ResolveResponse);
  }

  try {
    const provisioned = await convexHttpClient.action(
      anyApi.creatorVaults.provisionCreatorVault,
      {
        creatorWallet: walletAddress,
        factoryAddress,
        managerPrivateKey:
          process.env.NODE_ENV === "development"
            ? getServerEnv("BOOST_VAULT_MANAGER_PRIVATE_KEY")
            : undefined,
      },
    );

    return NextResponse.json({
      ok: true,
      walletAddress,
      vault: provisioned?.vault ?? null,
      txHash: provisioned?.txHash ?? null,
    } satisfies ResolveResponse);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        walletAddress,
        reason:
          error instanceof Error ? error.message : "Unable to provision vault.",
      } satisfies ResolveResponse,
      { status: 500 },
    );
  }
}
