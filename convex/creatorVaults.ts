import {
  action,
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { getAddress, isAddress, keccak256, toHex, zeroAddress } from "viem";
import { createCronosClients } from "./cronos";
import { cronosTestnet } from "viem/chains";
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
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
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

    const chainId = await publicClient.getChainId();
    if (chainId !== cronosTestnet.id) {
      throw new Error(
        `Cronos RPC chainId mismatch. Expected ${cronosTestnet.id}, got ${chainId}.`,
      );
    }

    const factoryCode = await publicClient.getBytecode({
      address: factoryAddress,
    });
    if (!factoryCode || factoryCode === "0x") {
      throw new Error(
        `Boost factory contract not deployed at ${factoryAddress}.`,
      );
    }

    const vaultAdminRole = keccak256(toHex("VAULT_ADMIN_ROLE"));
    const hasRole = (await publicClient.readContract({
      address: factoryAddress,
      abi: factoryAbi,
      functionName: "hasRole",
      args: [vaultAdminRole, walletClient.account.address],
    })) as boolean;

    if (!hasRole) {
      throw new Error(
        "Vault manager wallet lacks the required role on the factory contract. Grant VAULT_ADMIN_ROLE to the manager address.",
      );
    }
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

    let gasEstimate: bigint;
    try {
      gasEstimate = await publicClient.estimateContractGas({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: "createVault",
        args: [creatorWallet],
        account: walletClient.account,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      throw new Error(`Vault creation gas estimate failed: ${message}`);
    }

    try {
      await publicClient.simulateContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: "createVault",
        args: [creatorWallet],
        account: walletClient.account,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      throw new Error(`Vault creation simulation failed: ${message}`);
    }

    const gasFloor = 2_000_000n;
    const buffered = (gasEstimate * 15n) / 10n;
    const gas = buffered > gasFloor ? buffered : gasFloor;

    let txHash: `0x${string}` | null = null;
    try {
      txHash = await walletClient.writeContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: "createVault",
        args: [creatorWallet],
        gas,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status === "reverted") {
        throw new Error("Vault creation transaction reverted.");
      }
    } catch (error) {
      const fallbackVault = (await publicClient.readContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: "vaultOf",
        args: [creatorWallet],
      })) as `0x${string}`;

      if (fallbackVault && fallbackVault !== zeroAddress) {
        await ctx.runMutation(anyApi.creatorVaults.upsertVaultFromServer, {
          wallet: creatorWallet,
          vault: fallbackVault,
          txHash: txHash ?? existing?.txHash ?? null,
          secret: syncSecret,
        });
        return { vault: fallbackVault, txHash: txHash ?? existing?.txHash ?? null };
      }

      const rawMessage = error instanceof Error ? error.message : "Unknown error.";
      const lowered = rawMessage.toLowerCase();
      let reason = "Vault creation reverted. Please try again in a moment.";
      if (lowered.includes("accesscontrol") || lowered.includes("caller is not")) {
        reason =
          "Vault manager wallet lacks the required role on the factory contract.";
      } else if (lowered.includes("already") && lowered.includes("exist")) {
        reason = "Vault already exists but has not synced yet. Retry provisioning.";
      } else if (lowered.includes("transaction reverted")) {
        reason = "Vault creation transaction reverted. Check factory role + gas.";
      }
      return { vault: null, txHash: txHash ?? existing?.txHash ?? null, reason };
    }

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    let vault: `0x${string}` | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = (await publicClient.readContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: "vaultOf",
        args: [creatorWallet],
      })) as `0x${string}`;

      if (candidate && candidate !== zeroAddress) {
        vault = candidate;
        break;
      }

      await sleep(800 + attempt * 250);
    }

    if (!vault) {
      return { vault: null, txHash, reason: "Vault creation pending on-chain." };
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
