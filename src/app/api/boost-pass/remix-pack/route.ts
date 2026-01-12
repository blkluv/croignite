import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  verifyMessage,
} from "viem";
import { cronosTestnet } from "@/lib/web3/cronos";
import { cronosTestnetContracts } from "@/lib/contracts/addresses";
import boostPassAbi from "@/lib/contracts/abi/ClipYieldBoostPass.json";
import boostPassPack from "@/content/remix-packs/boost-pass-pack.json";
import { buildBoostPassPackMessage } from "@/features/boost-pass/message";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      address?: string;
      signature?: string;
      epoch?: number | string;
    };

    const address = body?.address?.trim();
    const signature = body?.signature?.trim();
    const rawEpoch = body?.epoch;
    const epoch =
      typeof rawEpoch === "string" ? Number.parseInt(rawEpoch, 10) : rawEpoch;

    if (!address || !signature || typeof epoch !== "number") {
      return new Response("Missing address, signature, or epoch.", { status: 400 });
    }

    if (!Number.isInteger(epoch) || epoch <= 0) {
      return new Response("Invalid epoch.", { status: 400 });
    }

    if (!isAddress(address)) {
      return new Response("Invalid wallet address.", { status: 400 });
    }

    const message = buildBoostPassPackMessage(epoch);
    const verified = await verifyMessage({
      address: getAddress(address),
      message,
      signature: signature as `0x${string}`,
    });

    if (!verified) {
      return new Response("Invalid signature.", { status: 401 });
    }

    const publicClient = createPublicClient({
      chain: cronosTestnet,
      transport: http(cronosTestnet.rpcUrls.default.http[0]),
    });

    const currentEpoch = (await publicClient.readContract({
      address: getAddress(cronosTestnetContracts.boostPass),
      abi: boostPassAbi,
      functionName: "currentEpoch",
    })) as bigint;

    if (BigInt(epoch) > currentEpoch) {
      return new Response("Epoch not published yet.", { status: 409 });
    }

    const balance = (await publicClient.readContract({
      address: getAddress(cronosTestnetContracts.boostPass),
      abi: boostPassAbi,
      functionName: "balanceOf",
      args: [getAddress(address), BigInt(epoch)],
    })) as bigint;

    if (balance <= 0n) {
      return new Response("Boost Pass required for this remix pack.", {
        status: 403,
      });
    }

    return Response.json({ pack: boostPassPack });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return new Response(message, { status: 500 });
  }
}
