import {
  action,
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { getAddress, isAddress, zeroAddress } from "viem";
import { createCronosClients } from "./cronos";
import { getEnv, requireEnv } from "./env";
import { anyApi } from "convex/server";

const factoryAbi = [
  {
    type: "function",
    name: "vaultOf",
    stateMutability: "view",
    inputs: [{ name: "creator", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "createVault",
    stateMutability: "nonpayable",
    inputs: [{ name: "creator", type: "address" }],
    outputs: [{ name: "vaultAddr", type: "address" }],
  },
] as const;

export const getByWallet = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    if (!isAddress(args.wallet)) {
      throw new Error("Invalid wallet address.");
    }

    const wallet = getAddress(args.wallet);
    return await ctx.db
      .query("creatorVaults")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .unique();
  },
});

export const getByWalletInternal = internalQuery({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("creatorVaults")
      .withIndex("by_wallet", (q) => q.eq("wallet", args.wallet))
      .unique();
  },
});

export const insertVaultInternal = internalMutation({
  args: {
    wallet: v.string(),
    vault: v.string(),
    txHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("creatorVaults", {
      wallet: args.wallet,
      vault: args.vault,
      txHash: args.txHash,
      createdAt: Date.now(),
    });
  },
});

export const upsertVaultFromServer = mutation({
  args: {
    secret: v.optional(v.string()),
    wallet: v.string(),
    vault: v.string(),
    txHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expected = getEnv("CROIGNITE_INTERNAL_WRITE_SECRET");
    if (expected && args.secret !== expected) {
      throw new Error("Invalid internal write secret.");
    }

    if (!isAddress(args.wallet) || !isAddress(args.vault)) {
      throw new Error("Invalid wallet or vault address.");
    }

    const wallet = getAddress(args.wallet);
    const vault = getAddress(args.vault);

    const existing = await ctx.db
      .query("creatorVaults")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        vault,
        txHash: args.txHash ?? existing.txHash,
      });
      return {
        vault,
        txHash: args.txHash ?? existing.txHash ?? null,
      };
    }

    await ctx.db.insert("creatorVaults", {
      wallet,
      vault,
      txHash: args.txHash,
      createdAt: Date.now(),
    });

    return { vault, txHash: args.txHash ?? null };
  },
});

export const provisionCreatorVault = action({
  args: {
    creatorWallet: v.string(),
    factoryAddress: v.optional(v.string()),
    managerPrivateKey: v.optional(v.string()),
    forceRefresh: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!isAddress(args.creatorWallet)) {
      throw new Error("Invalid creator wallet address.");
    }

    const creatorWallet = getAddress(args.creatorWallet);

    const existing = await ctx.runQuery(
      anyApi.creatorVaults.getByWalletInternal,
      { wallet: creatorWallet },
    );

    const factoryFromEnv =
      getEnv("BOOST_FACTORY_ADDRESS") ??
      getEnv("NEXT_PUBLIC_BOOST_FACTORY_ADDRESS");
    const factoryAddress = args.factoryAddress && isAddress(args.factoryAddress)
      ? getAddress(args.factoryAddress)
      : factoryFromEnv && isAddress(factoryFromEnv)
        ? getAddress(factoryFromEnv)
        : null;

    if (!factoryAddress) {
      throw new Error("Missing or invalid boost factory address.");
    }

    const privateKey =
      args.managerPrivateKey ?? requireEnv("BOOST_VAULT_MANAGER_PRIVATE_KEY");
    const { publicClient, walletClient } = createCronosClients(privateKey);
    const syncSecret = getEnv("CROIGNITE_INTERNAL_WRITE_SECRET");

    const onchainVault = (await publicClient.readContract({
      address: factoryAddress,
      abi: factoryAbi,
      functionName: "vaultOf",
      args: [creatorWallet],
    })) as `0x${string}`;

    if (onchainVault && onchainVault !== zeroAddress) {
      await ctx.runMutation(anyApi.creatorVaults.upsertVaultFromServer, {
        wallet: creatorWallet,
        vault: onchainVault,
        txHash: existing?.txHash ?? null,
        secret: syncSecret,
      });
      return { vault: onchainVault, txHash: existing?.txHash ?? null };
    }

    if (existing && !args.forceRefresh) {
      return { vault: existing.vault, txHash: existing.txHash ?? null };
    }

    const gasEstimate = await publicClient.estimateContractGas({
      address: factoryAddress,
      abi: factoryAbi,
      functionName: "createVault",
      args: [creatorWallet],
      account: walletClient.account,
    });

    const gasFloor = 30000n;
    const buffered = (gasEstimate * 12n) / 10n;
    const gas = buffered > gasFloor ? buffered : gasFloor;

    const txHash = await walletClient.writeContract({
      address: factoryAddress,
      abi: factoryAbi,
      functionName: "createVault",
      args: [creatorWallet],
      gas,
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    const vault = (await publicClient.readContract({
      address: factoryAddress,
      abi: factoryAbi,
      functionName: "vaultOf",
      args: [creatorWallet],
    })) as `0x${string}`;

    if (!vault || vault === zeroAddress) {
      throw new Error("Vault creation did not return a valid address.");
    }

    await ctx.runMutation(anyApi.creatorVaults.upsertVaultFromServer, {
      wallet: creatorWallet,
      vault,
      txHash,
      secret: syncSecret,
    });

    return { vault, txHash };
  },
});
