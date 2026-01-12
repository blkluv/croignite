import { getAddress, isAddress } from "viem";

export function requirePublicEnv(
  value: string | undefined,
  name: string,
): string {
  if (!value) {
    throw new Error(`Missing required public env var: ${name}`);
  }

  return value;
}

export function requirePublicAddress(
  value: string | undefined,
  name: string,
): `0x${string}` {
  const raw = requirePublicEnv(value, name);
  if (!isAddress(raw)) {
    throw new Error(`Invalid address for public env var: ${name}`);
  }
  return getAddress(raw);
}
