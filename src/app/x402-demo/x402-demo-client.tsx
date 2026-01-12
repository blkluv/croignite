"use client";

import { useMemo, useState } from "react";
import { useAccount, useChainId, useSignTypedData, useSwitchChain } from "wagmi";
import { parseUnits } from "viem";
import { USDCE_DECIMALS } from "@/lib/x402/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createX402PaymentHeader,
  type X402PaymentRequirements,
} from "@/lib/x402/paymentHeader";
import { cronosConfig } from "@/lib/web3/cronosConfig";

export default function X402DemoClient() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signTypedDataAsync } = useSignTypedData();
  const { switchChainAsync, isPending: switchingChain } = useSwitchChain();

  const [amount, setAmount] = useState("1");
  const [log, setLog] = useState<string>("");
  const [running, setRunning] = useState(false);

  const amountBaseUnits = useMemo(() => {
    try {
      return parseUnits(amount, USDCE_DECIMALS).toString();
    } catch (error) {
      return null;
    }
  }, [amount]);

  const endpoint = useMemo(() => {
    if (!amountBaseUnits) return "/api/x402/sponsor";
    const q = new URLSearchParams({ amount: amountBaseUnits });
    return `/api/x402/sponsor?${q.toString()}`;
  }, [amountBaseUnits]);

  async function run() {
    if (running) return;
    if (!amountBaseUnits) {
      setLog("Invalid amount. Please enter a valid devUSDC.e amount.");
      return;
    }

    if (!isConnected) {
      setLog("Connect your wallet to continue.");
      return;
    }

    if (chainId !== cronosConfig.chainId) {
      setRunning(true);
      setLog(
        `Switching wallet to Cronos Testnet (chainId ${cronosConfig.chainId})...\n`,
      );
      try {
        await switchChainAsync({ chainId: cronosConfig.chainId });
      } catch (error) {
        setLog(
          `Please switch your wallet to Cronos Testnet (chainId ${cronosConfig.chainId}) and try again.`,
        );
      } finally {
        setRunning(false);
      }
      return;
    }

    setRunning(true);
    setLog("1) Requesting payment requirements...\n");

    const initial = await fetch(endpoint, { method: "GET" });
    if (initial.status !== 402) {
      const text = await initial.text();
      setLog((p) => p + `Expected 402, got ${initial.status}\n` + text);
      setRunning(false);
      return;
    }

    const body = await initial.json();
    const req: X402PaymentRequirements = body.paymentRequirements;

    setLog((p) => p + "2) Signing EIP-712 authorization...\n");

    if (!address) throw new Error("Wallet not connected");

    const xPayment = await createX402PaymentHeader({
      from: address,
      requirements: req,
      signTypedData: (typedData) => signTypedDataAsync(typedData as any),
    });

    setLog((p) => p + "3) Retrying request with X-PAYMENT header...\n");

    const paid = await fetch(endpoint, {
      method: "GET",
      headers: { "X-PAYMENT": xPayment },
    });

    const paidJson = await paid.json().catch(() => null);

    if (!paid.ok) {
      setLog((p) => p + `Payment failed (${paid.status}).\n` + JSON.stringify(paidJson, null, 2));
      setRunning(false);
      return;
    }

    const txHash = paidJson?.payment?.txHash as string | undefined;
    setLog(
      (p) =>
        p +
        "✅ Payment settled!\n" +
        JSON.stringify(paidJson, null, 2) +
        (txHash ? `\nExplorer: https://explorer.cronos.org/testnet/tx/${txHash}\n` : ""),
    );
    setRunning(false);
  }

  const needsSwitch = isConnected && chainId !== cronosConfig.chainId;
  const isBusy = running || switchingChain;

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-background/70 p-4 shadow-sm">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="amount">
            Amount (devUSDC.e)
          </label>
          <Input
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1.0"
          />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={run}
            disabled={isBusy || !amountBaseUnits || !isConnected}
          >
            {!isConnected
              ? "Connect wallet first"
              : needsSwitch
                ? "Switch to Cronos Testnet"
                : isBusy
                  ? "Working..."
                  : "Sponsor via x402"}
          </Button>
          <span className="text-xs text-muted-foreground">
            The first request returns 402, then retries after signing.
          </span>
        </div>
      </Card>

      <Card className="border-border/60 bg-background/70 p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Request log
        </div>
        <pre className="mt-3 min-h-[140px] whitespace-pre-wrap rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-foreground">
          {log || "Run the demo to see the 402 → sign → settle flow."}
        </pre>
      </Card>
    </div>
  );
}
