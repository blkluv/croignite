import { getAddress, isAddress } from "viem";

export const EVM_ADDRESS_RE = /\b0x[a-fA-F0-9]{40}\b/g;

export function normalizeEvmAddress(input: string): `0x${string}` {
  const addr = input.trim();

  if (!isAddress(addr, { strict: false })) {
    throw new Error(`Invalid address format: '${addr}'`);
  }

  return getAddress(addr);
}

export function normalizeEvmAddressesInText(text: string): string {
  return text.replace(EVM_ADDRESS_RE, (match) => {
    try {
      return normalizeEvmAddress(match);
    } catch {
      return match;
    }
  });
}

export function extractEvmAddresses(text: string): `0x${string}`[] {
  const matches = text.match(EVM_ADDRESS_RE) ?? [];
  const normalized = new Set<`0x${string}`>();
  for (const match of matches) {
    try {
      normalized.add(normalizeEvmAddress(match));
    } catch {
      // ignore invalid matches
    }
  }
  return Array.from(normalized);
}
