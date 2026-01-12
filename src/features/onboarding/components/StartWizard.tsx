"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import WalletGateSkeleton from "@/components/feedback/WalletGateSkeleton";
import { formatShortHash } from "@/lib/utils";
import { explorerAddressUrl, cronosConfig } from "@/lib/web3/cronosConfig";

export default function StartWizard() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const [isMounted, setIsMounted] = useState(false);
  const [facilitatorStatus, setFacilitatorStatus] = useState<
    "loading" | "ok" | "down" | "error"
  >("loading");
  const [supportedNetworks, setSupportedNetworks] = useState<string[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const load = async () => {
      try {
        const healthRes = await fetch("/api/x402/health");
        setFacilitatorStatus(healthRes.ok ? "ok" : "down");
      } catch {
        setFacilitatorStatus("error");
      }

      try {
        const supportedRes = await fetch("/api/x402/supported");
        const payload = await supportedRes.json().catch(() => ({}));
        const networks =
          (Array.isArray(payload?.networks) && payload.networks) ||
          (Array.isArray(payload?.supportedNetworks) && payload.supportedNetworks) ||
          (Array.isArray(payload?.data?.networks) && payload.data.networks) ||
          [];
        const normalized = networks
          .filter((item: unknown): item is string => typeof item === "string")
          .sort();
        setSupportedNetworks(normalized);
      } catch {
        setSupportedNetworks([]);
      }
    };

    void load();
  }, [isMounted]);

  const isConnectedReady = isMounted && isConnected;
  const isOnCronos = isMounted && chainId === cronosConfig.chainId;

  const nativeBalance = useBalance({
    address,
    query: { enabled: Boolean(address && isOnCronos && isMounted) },
  });

  const usdceBalance = useBalance({
    address,
    token: cronosConfig.usdceAddress,
    query: { enabled: Boolean(address && isOnCronos && isMounted) },
  });

  const nativeBalanceLabel =
    isConnectedReady && isOnCronos ? nativeBalance.data?.formatted ?? "0" : "—";
  const usdceBalanceLabel =
    isConnectedReady && isOnCronos ? usdceBalance.data?.formatted ?? "0" : "—";

  const networkStatus = !isMounted
    ? "Checking..."
    : !isConnected
      ? "Connect wallet"
      : isOnCronos
        ? "Ready"
        : "Wrong network";

  const facilitatorBadge =
    facilitatorStatus === "ok"
      ? "Online"
      : facilitatorStatus === "down"
        ? "Degraded"
        : facilitatorStatus === "error"
          ? "Error"
          : "Checking...";

  const handleSwitchChain = async () => {
    if (!switchChainAsync) return;
    await switchChainAsync({ chainId: cronosConfig.chainId });
  };

  if (!isConnected || !isMounted) {
    return <WalletGateSkeleton cards={3} />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Start on Cronos Testnet</h1>
        <p className="text-sm text-muted-foreground">
          Follow these steps to fund your wallet and unlock CroIgnite sponsor flows on
          Cronos Testnet.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>1. Connect a wallet</CardTitle>
              <CardDescription>Connect the wallet you will use for sponsorships.</CardDescription>
            </div>
            <Badge variant={isConnectedReady ? "success" : "warning"}>
              {isMounted ? (isConnected ? "Connected" : "Not connected") : "Checking..."}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Wallet</span>
              <span>{isConnectedReady && address ? formatShortHash(address) : "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>2. Switch to Cronos Testnet</CardTitle>
              <CardDescription>
                CroIgnite runs on Cronos Testnet (chain {cronosConfig.chainId}).
              </CardDescription>
            </div>
            <Badge variant={isConnectedReady && isOnCronos ? "success" : "warning"}>
              {networkStatus}
            </Badge>
          </CardHeader>
          <CardContent>
            {isConnectedReady && !isOnCronos && (
              <Button variant="outline" onClick={handleSwitchChain}>
                Switch network
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Fund your wallet</CardTitle>
            <CardDescription>Get tCRO for gas on Cronos Testnet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">tCRO balance</span>
              <span>{nativeBalanceLabel}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href={cronosConfig.faucetUrl} target="_blank" rel="noreferrer">
                  Open tCRO faucet
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Get devUSDC.e</CardTitle>
            <CardDescription>
              devUSDC.e powers x402 sponsorships and invoice receipts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">devUSDC.e balance</span>
              <span>{usdceBalanceLabel}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href={cronosConfig.usdceFaucetUrl} target="_blank" rel="noreferrer">
                  Open devUSDC.e faucet
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link
                  href={explorerAddressUrl(cronosConfig.usdceAddress)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View token contract
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>5. Facilitator status</CardTitle>
              <CardDescription>
                Cronos x402 facilitator health and supported networks.
              </CardDescription>
            </div>
            <Badge variant={facilitatorStatus === "ok" ? "success" : "warning"}>
              {facilitatorBadge}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Health</span>
              <span>{facilitatorBadge}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Supported networks</span>
              <span>
                {supportedNetworks.length > 0
                  ? supportedNetworks.join(", ")
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Continue into CroIgnite</CardTitle>
            <CardDescription>
              Head to the feed or launch the AI sponsor agent to ignite clips.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/">Browse feed</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/x402-demo">Try x402 demo</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
