import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { createPublicClient, createWalletClient, getAddress, http, isAddress, keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { cronosTestnet } from "viem/chains";

const rpcUrl =
  process.env.CRONOS_TESTNET_RPC_URL ??
  process.env.NEXT_PUBLIC_CRONOS_TESTNET_RPC_URL ??
  "https://evm-t3.cronos.org";

const factoryAddress =
  process.env.BOOST_FACTORY_ADDRESS ??
  process.env.NEXT_PUBLIC_BOOST_FACTORY_ADDRESS ??
  "";

const adminKey = process.env.BOOST_FACTORY_ADMIN_PRIVATE_KEY;

const managerAddress =
  process.env.BOOST_VAULT_MANAGER_ADDRESS ??
  (process.env.BOOST_VAULT_MANAGER_PRIVATE_KEY
    ? privateKeyToAccount(process.env.BOOST_VAULT_MANAGER_PRIVATE_KEY as `0x${string}`).address
    : "");

if (!adminKey) {
  throw new Error("Missing BOOST_FACTORY_ADMIN_PRIVATE_KEY.");
}
if (!factoryAddress || !isAddress(factoryAddress)) {
  throw new Error("Missing or invalid BOOST_FACTORY_ADDRESS.");
}
if (!managerAddress || !isAddress(managerAddress)) {
  throw new Error("Missing or invalid BOOST_VAULT_MANAGER_ADDRESS.");
}

const adminAccount = privateKeyToAccount(adminKey as `0x${string}`);

const publicClient = createPublicClient({
  chain: cronosTestnet,
  transport: http(rpcUrl),
});

const walletClient = createWalletClient({
  chain: cronosTestnet,
  transport: http(rpcUrl),
  account: adminAccount,
});

const factoryAbi = [
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
  {
    type: "function",
    name: "grantRole",
    stateMutability: "nonpayable",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [],
  },
] as const;

async function main() {
  const role = keccak256(toHex("VAULT_ADMIN_ROLE"));
  const factory = getAddress(factoryAddress);
  const manager = getAddress(managerAddress);

  const hasRole = (await publicClient.readContract({
    address: factory,
    abi: factoryAbi,
    functionName: "hasRole",
    args: [role, manager],
  })) as boolean;

  if (hasRole) {
    console.log("VAULT_ADMIN_ROLE already granted.");
    return;
  }

  const txHash = await walletClient.writeContract({
    address: factory,
    abi: factoryAbi,
    functionName: "grantRole",
    args: [role, manager],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`Granted VAULT_ADMIN_ROLE to ${manager}`);
  console.log(`tx: https://explorer.cronos.org/testnet/tx/${txHash}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
