"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import {
  useAccount,
  useChainId,
  useSignMessage,
  useSwitchChain,
} from "wagmi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WalletGateSkeleton from "@/components/feedback/WalletGateSkeleton";
import { cronosTestnetContracts } from "@/lib/contracts/addresses";
import { buildBoostPassPackMessage } from "@/features/boost-pass/message";
import { useBoostPass } from "@/features/boost-pass/hooks/useBoostPass";
import {
  applyBoostPassPack,
  type BoostPassPack,
} from "@/features/boost-pass/utils";
import { createProjectState } from "@/app/store/slices/projectSlice";
import { storeProject } from "@/app/store";
import boostPassPackPreview from "@/content/remix-packs/boost-pass-pack.json";

type ActionId = "download" | "create";

export default function BoostPassPerksPanel() {
  const { address, isConnected } = useAccount();
  const ownerWallet = address ? address.toLowerCase() : undefined;
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();
  const router = useRouter();

  const { currentEpoch, hasPass, isOnCronos } = useBoostPass();

  const [pendingAction, setPendingAction] = useState<ActionId | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const epochNumber = currentEpoch ? Number(currentEpoch) : null;
  const publishIntervalHoursRaw =
    process.env.NEXT_PUBLIC_BOOST_PASS_EPOCH_INTERVAL_HOURS ?? "24";
  const publishIntervalHours = Number.isFinite(Number(publishIntervalHoursRaw))
    ? Number(publishIntervalHoursRaw)
    : 24;

  const fetchPack = async (): Promise<BoostPassPack> => {
    if (!address || !epochNumber) {
      throw new Error("Missing wallet or epoch information.");
    }
    const message = buildBoostPassPackMessage(epochNumber);
    const signature = await signMessageAsync({ message });
    const res = await fetch("/api/boost-pass/remix-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, signature, epoch: epochNumber }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to fetch remix pack.");
    }

    const payload = (await res.json()) as { pack: BoostPassPack };
    return payload.pack;
  };

  const handleDownload = async () => {
    if (!isConnected) return;
    if (!isOnCronos) {
      setActionError("Switch to Cronos Testnet to continue.");
      return;
    }
    if (!hasPass) {
      setActionError("Boost Pass required to download this pack.");
      return;
    }

    setPendingAction("download");
    setActionError(null);
    setSuccessMessage(null);
    try {
      const pack = await fetchPack();
      const blob = new Blob([JSON.stringify(pack, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "croignite-boost-pass-pack.json";
      anchor.click();
      URL.revokeObjectURL(url);
      setSuccessMessage("Boost Pass pack downloaded.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setPendingAction(null);
    }
  };

  const handleCreateProject = async () => {
    if (!isConnected) return;
    if (!isOnCronos) {
      setActionError("Switch to Cronos Testnet to continue.");
      return;
    }
    if (!hasPass) {
      setActionError("Boost Pass required to import this pack.");
      return;
    }

    setPendingAction("create");
    setActionError(null);
    setSuccessMessage(null);
    try {
      const pack = await fetchPack();
      const baseProject = createProjectState({
        projectName: "Boost Pass Remix",
        ownerWallet,
      });
      const nextProject = applyBoostPassPack(baseProject, pack);
      await storeProject(nextProject, ownerWallet);
      setSuccessMessage("Boost Pass pack imported into a new project.");
      router.push(`/projects/${nextProject.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setPendingAction(null);
    }
  };

  const handleSwitchChain = async () => {
    if (!switchChainAsync) return;
    setActionError(null);
    await switchChainAsync({ chainId: cronosTestnetContracts.chainId });
  };

  if (!isConnected) {
    return <WalletGateSkeleton cards={2} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Boost Pass Remix Pack</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Pack</span>
            <span>{boostPassPackPreview.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Version</span>
            <span>{boostPassPackPreview.version}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Epoch</span>
            <span>{epochNumber ?? "Loading..."}</span>
          </div>
        </CardContent>
      </Card>

      {isConnected && chainId !== cronosTestnetContracts.chainId && (
        <Alert variant="warning">
          <AlertTitle>Wrong network</AlertTitle>
          <AlertDescription>Switch to Cronos Testnet to continue.</AlertDescription>
          <div className="mt-3">
            <Button variant="outline" onClick={handleSwitchChain}>
              Switch network
            </Button>
          </div>
        </Alert>
      )}

      {isConnected && isOnCronos && !epochNumber && (
        <Alert variant="info">
          <AlertTitle>No epoch published</AlertTitle>
          <AlertDescription>
            Boost Pass perks unlock after the first epoch is published. Epochs
            auto-publish every {publishIntervalHours} hours.
          </AlertDescription>
        </Alert>
      )}

      {isConnected && isOnCronos && epochNumber && !hasPass && (
        <Alert variant="warning">
          <AlertTitle>Boost Pass required</AlertTitle>
          <AlertDescription>
            Claim your Boost Pass on the leaderboard to unlock this pack.
          </AlertDescription>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive">
          <AlertTitle>Action blocked</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleDownload}
          disabled={pendingAction === "download" || !hasPass}
        >
          {pendingAction === "download" ? "Downloading..." : "Download pack"}
        </Button>
        <Button
          variant="outline"
          onClick={handleCreateProject}
          disabled={pendingAction === "create" || !hasPass}
        >
          {pendingAction === "create" ? "Creating..." : "Create remix project"}
        </Button>
      </div>
    </div>
  );
}
