import "dotenv/config";
import { ethers } from "ethers";
import {
  Contract,
  CronosNetwork,
  Facilitator,
} from "@crypto.com/facilitator-client";

const facilitator = new Facilitator({ network: CronosNetwork.CronosTestnet });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

const buyerPrivateKey = requireEnv("X402_TEST_BUYER_PRIVATE_KEY");
const sellerWallet = requireEnv("X402_SELLER_WALLET");
const rpcUrl = process.env.CRONOS_TESTNET_RPC_URL ?? "https://evm-t3.cronos.org";
const defaultAmount = process.env.X402_DEFAULT_AMOUNT ?? "1000000";
const amount = process.argv[2] ?? defaultAmount;

if (!/^\d+$/.test(amount)) {
  console.error("Amount must be a base-units integer string (e.g. 1000000).");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(rpcUrl);
const signer = new ethers.Wallet(buyerPrivateKey, provider);

async function main() {
  const header = await facilitator.generatePaymentHeader({
    to: sellerWallet,
    value: amount,
    asset: Contract.DevUSDCe,
    signer,
    validBefore: Math.floor(Date.now() / 1000) + 300,
  });

  console.log(header);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
