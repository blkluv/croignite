import { getAddress } from "viem";

const rawAllowlist = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESSES ?? "";

export const ADMIN_WALLET_ALLOWLIST = new Set(
  rawAllowlist
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean)
    .map((address) => getAddress(address)),
);

export function isAdminAddress(address?: string | null): boolean {
  if (!address) return false;
  try {
    return ADMIN_WALLET_ALLOWLIST.has(getAddress(address));
  } catch {
    return false;
  }
}
