import type { Address } from "viem";
import { toHex } from "viem";
import {
  CRONOS_MAINNET_CHAIN_ID,
  CRONOS_TESTNET_CHAIN_ID,
  USDCE_EIP712_DOMAIN,
  X402_NETWORK,
  X402_NETWORKS,
  X402_SCHEME,
  X402_VERSION,
} from "@/lib/x402/constants";

export type X402PaymentRequirements = {
  scheme: string;
  network: string;
  payTo: Address;
  asset: Address;
  maxAmountRequired: string;
  maxTimeoutSeconds: number;
};

function generateNonce32(): `0x${string}` {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toHex(bytes);
}

function base64EncodeUtf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function createX402PaymentHeader(args: {
  from: Address;
  requirements: X402PaymentRequirements;
  signTypedData: (typedData: {
    domain: Record<string, unknown>;
    types: Record<string, unknown>;
    primaryType: string;
    message: Record<string, unknown>;
  }) => Promise<`0x${string}`>;
}): Promise<string> {
  const { from, requirements, signTypedData } = args;
  const network = requirements.network ?? X402_NETWORK;
  const chainId =
    network === X402_NETWORKS.mainnet
      ? CRONOS_MAINNET_CHAIN_ID
      : CRONOS_TESTNET_CHAIN_ID;
  const nonce = generateNonce32();
  const validAfter = 0n;
  const validBefore = BigInt(
    Math.floor(Date.now() / 1000) + requirements.maxTimeoutSeconds,
  );

  const domain = {
    ...USDCE_EIP712_DOMAIN,
    chainId,
    verifyingContract: requirements.asset,
  };

  const types = {
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  };

  const message = {
    from,
    to: requirements.payTo,
    value: BigInt(requirements.maxAmountRequired),
    validAfter,
    validBefore,
    nonce,
  };

  const signature = await signTypedData({
    domain,
    types,
    primaryType: "TransferWithAuthorization",
    message,
  });

  const paymentHeader = {
    x402Version: X402_VERSION,
    scheme: requirements.scheme ?? X402_SCHEME,
    network,
    payload: {
      from,
      to: requirements.payTo,
      value: requirements.maxAmountRequired,
      validAfter: validAfter.toString(),
      validBefore: validBefore.toString(),
      nonce,
      signature,
      asset: requirements.asset,
    },
  };

  return base64EncodeUtf8(JSON.stringify(paymentHeader));
}
