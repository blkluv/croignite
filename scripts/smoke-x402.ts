import "dotenv/config";

import {
  Contract,
  CronosNetwork,
  Facilitator,
  X402EventType,
} from "@crypto.com/facilitator-client";
import { ethers } from "ethers";

const buyerKey = process.env.X402_TEST_BUYER_PRIVATE_KEY;
const sellerWallet = process.env.X402_SELLER_WALLET;
const rpcUrl =
  process.env.CRONOS_TESTNET_RPC_URL ??
  process.env.NEXT_PUBLIC_CRONOS_RPC_URL ??
  "https://evm-t3.cronos.org";

if (!buyerKey) {
  throw new Error("Missing X402_TEST_BUYER_PRIVATE_KEY in env.");
}
if (!sellerWallet) {
  throw new Error("Missing X402_SELLER_WALLET in env.");
}

const amount =
  process.env.X402_DEFAULT_AMOUNT && /^\d+$/.test(process.env.X402_DEFAULT_AMOUNT)
    ? process.env.X402_DEFAULT_AMOUNT
    : "1000000";

async function main() {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(buyerKey, provider);

  const facilitator = new Facilitator({
    network: CronosNetwork.CronosTestnet,
  });

  const paymentRequirements = facilitator.generatePaymentRequirements({
    payTo: sellerWallet,
    asset: Contract.DevUSDCe,
    description: "CroIgnite x402 smoke test",
    maxAmountRequired: amount,
  });

  const paymentHeader = await facilitator.generatePaymentHeader({
    to: sellerWallet,
    asset: Contract.DevUSDCe,
    value: amount,
    signer,
    validBefore: Math.floor(Date.now() / 1000) + 600,
  });

  const verifyBody = facilitator.buildVerifyRequest(
    paymentHeader,
    paymentRequirements,
  );

  const verify = await facilitator.verifyPayment(verifyBody);
  if (!verify.isValid) {
    throw new Error(
      `x402 verify failed: ${verify.invalidReason ?? "unknown"}`,
    );
  }

  const settle = await facilitator.settlePayment(verifyBody);
  if (settle.event !== X402EventType.PaymentSettled) {
    throw new Error(`x402 settle failed: ${settle.error ?? "unknown"}`);
  }

  if (!settle.txHash) {
    throw new Error("Settlement response missing txHash.");
  }

  console.log(`settled txHash: ${settle.txHash}`);
  console.log(
    `explorer: https://explorer.cronos.org/testnet/tx/${settle.txHash}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
