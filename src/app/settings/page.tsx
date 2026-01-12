"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useAccount, useChainId } from "wagmi";
import MainLayout from "@/app/layouts/MainLayout";
import { useGeneralStore } from "@/app/stores/general";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ThemeToggle from "@/components/ui/theme-toggle";
import { cronosTestnetContracts } from "@/lib/contracts/addresses";
import { formatShortHash } from "@/lib/utils";
import { OpenAIKeyCard } from "./OpenAIKeyCard";

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { isFeedMuted, setIsFeedMuted, isAutoScrollEnabled, setIsAutoScrollEnabled } =
    useGeneralStore();

  const isOnCronos = chainId === cronosTestnetContracts.chainId;
  const walletLabel = useMemo(
    () => (address ? formatShortHash(address) : "Not connected"),
    [address],
  );

  const networkLabel = isConnected
    ? isOnCronos
      ? "Cronos Testnet"
      : "Wrong network"
    : "-";

  const accountCard = !isConnected ? (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-36" />
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Wallet and verification</CardTitle>
          <Badge variant="success">Connected</Badge>
        </div>
        <CardDescription>
          Your wallet powers sponsorship receipts, boosts, and vault activity.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Wallet</span>
          <span className="font-mono text-xs">{walletLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Network</span>
          <span>{networkLabel}</span>
        </div>
        <Button asChild variant="outline">
          <Link href="/yield">Open yield vault</Link>
        </Button>
      </CardContent>
    </Card>
  );

  const playbackCard = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Playback</CardTitle>
        <CardDescription>
          Control how clips behave across the feed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="font-medium">Mute clips by default</div>
            <p className="text-xs text-muted-foreground">
              Start For You and Following feeds muted.
            </p>
          </div>
          <Switch
            checked={isFeedMuted}
            onCheckedChange={setIsFeedMuted}
            ariaLabel="Mute clips by default"
          />
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="font-medium">Auto-advance clips</div>
            <p className="text-xs text-muted-foreground">
              Scroll to the next clip after the current one finishes.
            </p>
          </div>
          <Switch
            checked={isAutoScrollEnabled}
            onCheckedChange={setIsAutoScrollEnabled}
            ariaLabel="Auto-advance clips"
          />
        </div>
      </CardContent>
    </Card>
  );

  const appearanceCard = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Appearance</CardTitle>
        <CardDescription>
          Adjust how CroIgnite looks on this device.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between text-sm">
        <div className="space-y-1">
          <div className="font-medium">Theme</div>
          <p className="text-xs text-muted-foreground">
            Toggle between light and dark mode.
          </p>
        </div>
        <ThemeToggle className="h-9 w-9" />
      </CardContent>
    </Card>
  );

  const aiTipsCard = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI workflow tips</CardTitle>
        <CardDescription>
          Keep your Sora generations organized and ready for remixing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          Generate clips from the editor&apos;s AI Studio, then drag them from
          History into your timeline. Generations stay synced to the current
          project in local storage.
        </p>
        <p>
          Use short prompts for rapid iteration, then increase duration and size
          once you land on a final look.
        </p>
      </CardContent>
    </Card>
  );

  const openAiFallback = (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );

  const allSections = [
    { id: "account", node: accountCard },
    { id: "playback", node: playbackCard },
    { id: "appearance", node: appearanceCard },
    {
      id: "openai",
      node: (
        <Suspense fallback={openAiFallback}>
          <OpenAIKeyCard />
        </Suspense>
      ),
    },
    { id: "ai-tips", node: aiTipsCard },
  ];

  const settingsTabs = [
    {
      value: "all",
      label: "All",
      sections: allSections,
    },
    {
      value: "account",
      label: "Account",
      sections: allSections.filter((section) => section.id === "account"),
    },
    {
      value: "playback",
      label: "Playback",
      sections: allSections.filter((section) => section.id === "playback"),
    },
    {
      value: "appearance",
      label: "Appearance",
      sections: allSections.filter((section) => section.id === "appearance"),
    },
    {
      value: "ai",
      label: "AI Studio",
      sections: allSections.filter(
        (section) => section.id === "openai" || section.id === "ai-tips",
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="w-full px-4 pb-24 pt-[100px] lg:pr-0">
        <div className="mx-auto w-full max-w-5xl space-y-8">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your CroIgnite preferences and AI video generation access.
            </p>
          </header>

          <Tabs defaultValue={settingsTabs[0].value} className="space-y-6">
            <TabsList
              aria-label="Settings sections"
              className="mx-auto flex h-auto w-full max-w-3xl flex-wrap items-center justify-center gap-2 rounded-2xl bg-muted/40 p-2 text-muted-foreground"
            >
              {settingsTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="rounded-xl">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {settingsTabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                <div className="grid gap-6 lg:grid-cols-2">
                  {tab.sections.map((section) => (
                    <div key={section.id}>{section.node}</div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
