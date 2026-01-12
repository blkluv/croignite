"use client";

import { useAccount, useChainId, useReadContract, useWriteContract } from "wagmi";
import type { Address } from "viem";
import boostPassAbi from "@/lib/contracts/abi/ClipYieldBoostPass.json";
import { cronosTestnetContracts } from "@/lib/contracts/addresses";

export function useBoostPass() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync, isPending } = useWriteContract();

  const boostPassAddress = cronosTestnetContracts.boostPass as Address;
  const isOnCronos = chainId === cronosTestnetContracts.chainId;
  const refetchInterval = 15_000;

  const { data: currentEpoch } = useReadContract({
    address: boostPassAddress,
    abi: boostPassAbi,
    functionName: "currentEpoch",
    query: { enabled: isOnCronos, refetchInterval },
  });

  const epochValue = typeof currentEpoch === "bigint" ? currentEpoch : null;
  const canQuery = Boolean(address && epochValue !== null && isOnCronos);

  const { data: eligible } = useReadContract({
    address: boostPassAddress,
    abi: boostPassAbi,
    functionName: "eligible",
    args: address && epochValue !== null ? [epochValue, address] : undefined,
    query: { enabled: canQuery, refetchInterval },
  });

  const { data: claimed } = useReadContract({
    address: boostPassAddress,
    abi: boostPassAbi,
    functionName: "claimed",
    args: address && epochValue !== null ? [epochValue, address] : undefined,
    query: { enabled: canQuery, refetchInterval },
  });

  const { data: balance } = useReadContract({
    address: boostPassAddress,
    abi: boostPassAbi,
    functionName: "balanceOf",
    args: address && epochValue !== null ? [address, epochValue] : undefined,
    query: { enabled: canQuery, refetchInterval },
  });

  const claim = async (epoch: bigint) => {
    return await writeContractAsync({
      address: boostPassAddress,
      abi: boostPassAbi,
      functionName: "claim",
      args: [epoch],
    });
  };

  return {
    address,
    boostPassAddress,
    currentEpoch: epochValue,
    eligible: Boolean(eligible),
    claimed: Boolean(claimed),
    balance: typeof balance === "bigint" ? balance : null,
    hasPass: typeof balance === "bigint" ? balance > 0n : false,
    claim,
    isClaimPending: isPending,
    isOnCronos,
  };
}
