import "dotenv/config";

import { createClient } from "@crypto.com/ai-agent-client";
import { Role } from "@crypto.com/ai-agent-client/dist/integrations/cdc-ai-agent.interfaces";
import { z } from "zod";

type QueryOptions = Parameters<typeof createClient>[0];

type QueryContext = NonNullable<QueryOptions["context"]>[number];

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  CRONOS_TESTNET_EXPLORER_API_KEY: z.string().min(1),
  CRONOS_CHAIN_ID: z.coerce.number().default(338),
  CRONOS_TESTNET_RPC_URL: z.string().url().optional(),
});

const env = EnvSchema.parse(process.env);

const context: QueryContext[] = [
  { role: Role.System, content: "App: CroIgnite (x402 sponsorships on Cronos testnet)." },
  { role: Role.System, content: "Network: Cronos EVM Testnet (chainId 338)." },
];

const queryOptions: QueryOptions = {
  openAI: {
    apiKey: env.OPENAI_API_KEY,
    model: "gpt-4o",
  },
  chainId: env.CRONOS_CHAIN_ID,
  explorerKeys: {
    cronosTestnetKey: env.CRONOS_TESTNET_EXPLORER_API_KEY,
  },
  context,
  customRPC: env.CRONOS_TESTNET_RPC_URL,
};

async function main() {
  const client = createClient(queryOptions);
  const response = await client.agent.generateQuery(
    "What is the latest block on Cronos testnet?",
  );

  console.log("agent response:");
  console.log(response);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
