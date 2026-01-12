import { requirePublicAddress } from "@/lib/env/public";
import { cronosConfig } from "@/lib/web3/cronosConfig";

export const cronosTestnetContracts = {
  chainId: cronosConfig.chainId,
  usdce: cronosConfig.usdceAddress,
  croigniteVault: requirePublicAddress(
    process.env.NEXT_PUBLIC_CROIGNITE_VAULT_ADDRESS,
    "NEXT_PUBLIC_CROIGNITE_VAULT_ADDRESS",
  ),
  boostFactory: requirePublicAddress(
    process.env.NEXT_PUBLIC_BOOST_FACTORY_ADDRESS,
    "NEXT_PUBLIC_BOOST_FACTORY_ADDRESS",
  ),
  sponsorHub: requirePublicAddress(
    process.env.NEXT_PUBLIC_SPONSOR_HUB_ADDRESS,
    "NEXT_PUBLIC_SPONSOR_HUB_ADDRESS",
  ),
  invoiceReceipts: requirePublicAddress(
    process.env.NEXT_PUBLIC_INVOICE_RECEIPTS_ADDRESS,
    "NEXT_PUBLIC_INVOICE_RECEIPTS_ADDRESS",
  ),
  boostPass: requirePublicAddress(
    process.env.NEXT_PUBLIC_BOOST_PASS_ADDRESS,
    "NEXT_PUBLIC_BOOST_PASS_ADDRESS",
  ),
  yieldStreamer: requirePublicAddress(
    process.env.NEXT_PUBLIC_YIELD_STREAMER_ADDRESS,
    "NEXT_PUBLIC_YIELD_STREAMER_ADDRESS",
  ),
} as const;

export const cronosTestnetContractCatalog = [
  {
    id: "usdce",
    name: "devUSDC.e",
    address: cronosTestnetContracts.usdce,
    description:
      "Testnet bridged USDC used for x402 payments and sponsor settlements.",
    tags: ["ERC-20", "Asset"],
    group: "assets",
  },
  {
    id: "yield-vault",
    name: "CroIgnite Vault",
    address: cronosTestnetContracts.croigniteVault,
    description:
      "ERC-4626 vault for testnet deposits and protocol fee yield.",
    tags: ["ERC-4626", "Vault"],
    group: "core",
  },
  {
    id: "boost-factory",
    name: "Boost Vault Factory",
    address: cronosTestnetContracts.boostFactory,
    description:
      "Deploys per-creator boost vaults and maps creator wallets to vault addresses.",
    tags: ["Factory", "Creator"],
    group: "core",
  },
  {
    id: "sponsor-hub",
    name: "Sponsor Hub",
    address: cronosTestnetContracts.sponsorHub,
    description:
      "Routes sponsor payments, collects protocol fees, and funds creator boost vaults.",
    tags: ["Sponsorship", "Payments"],
    group: "sponsorship",
  },
  {
    id: "invoice-receipts",
    name: "Invoice Receipts",
    address: cronosTestnetContracts.invoiceReceipts,
    description:
      "ERC-721 receipts that track sponsorship campaigns and invoice metadata.",
    tags: ["ERC-721", "Receipts"],
    group: "sponsorship",
  },
  {
    id: "boost-pass",
    name: "Boost Pass",
    address: cronosTestnetContracts.boostPass,
    description:
      "ERC-1155 soulbound pass minted for leaderboard rewards and remix perks.",
    tags: ["ERC-1155", "Perks"],
    group: "perks",
  },
  {
    id: "yield-streamer",
    name: "Simulated Yield Streamer",
    address: cronosTestnetContracts.yieldStreamer,
    description:
      "Testnet yield streamer that drips assets into the vault to simulate returns.",
    tags: ["Yield", "Streamer"],
    group: "perks",
  },
] as const;
