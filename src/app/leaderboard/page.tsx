"use client";

import { useEffect, useMemo, useState } from "react";
import MainLayout from "@/app/layouts/MainLayout";
import getLatestLeaderboard from "@/app/hooks/useGetLatestLeaderboard";
import getLatestBoostPassEpoch from "@/app/hooks/useGetLatestBoostPassEpoch";
import type { BoostPassEpoch, LeaderboardSnapshot } from "@/app/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatShortHash } from "@/lib/utils";
import BoostPassClaimCard from "@/features/boost-pass/components/BoostPassClaimCard";
import BoostPassExplainerCard from "@/features/boost-pass/components/BoostPassExplainerCard";
import { formatUnits } from "viem";

export default function LeaderboardPage() {
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [latestEpoch, setLatestEpoch] = useState<BoostPassEpoch | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async (refresh = false) => {
      if (!refresh) {
        setStatus("loading");
      }
      setError(null);
      try {
        const [leaderboardResult, epochResult] = await Promise.all([
          getLatestLeaderboard(),
          getLatestBoostPassEpoch(),
        ]);
        if (!isMounted) return;
        setSnapshot(leaderboardResult);
        setLatestEpoch(epochResult);
        setStatus("ready");
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load leaderboard.");
        setStatus("error");
      }
    };

    void load(false);
    const interval = setInterval(() => {
      void load(true);
    }, 60_000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const formattedCreators = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.topCreators.map((entry) => {
      const sponsored = BigInt(entry.sponsoredWei);
      const boost = BigInt(entry.boostWei);
      return {
        creatorId: entry.creatorId,
        sponsored,
        boost,
        total: sponsored + boost,
      };
    });
  }, [snapshot]);

  const formattedBoosters = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.topBoosters.map((entry) => ({
      wallet: entry.wallet,
      boost: BigInt(entry.boostWei),
    }));
  }, [snapshot]);

  const formatWei = (value: bigint) => {
    try {
      return formatUnits(value, 6);
    } catch {
      return value.toString();
    }
  };

  return (
    <MainLayout>
      <div className="w-full px-4 pb-24 pt-[100px] lg:pr-0">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Boost leaderboards</h1>
            <p className="text-sm text-muted-foreground">
              Ranked by confirmed on-chain boosts and sponsorships.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <BoostPassClaimCard snapshot={snapshot} latestEpoch={latestEpoch} />
            <BoostPassExplainerCard latestEpoch={latestEpoch} />
          </div>

          {status === "error" && (
            <Alert variant="destructive">
              <AlertTitle>Unable to load leaderboard</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status === "loading" && (
            <Alert variant="info">
              <AlertTitle>Loading leaderboard</AlertTitle>
              <AlertDescription>Aggregating confirmed vault activity.</AlertDescription>
            </Alert>
          )}

          {status === "ready" && !snapshot && (
            <Alert variant="warning">
              <AlertTitle>No leaderboard yet</AlertTitle>
              <AlertDescription>
                We&apos;ll populate rankings after the first confirmed boosts.
              </AlertDescription>
            </Alert>
          )}

          {status === "ready" && snapshot && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle>Top creators</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(snapshot.ts).toLocaleString()}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-lg border border-border/60">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Rank</th>
                          <th className="px-3 py-2">Creator</th>
                          <th className="px-3 py-2">Sponsored (devUSDC.e)</th>
                          <th className="px-3 py-2">Boosted (devUSDC.e)</th>
                          <th className="px-3 py-2">Total (devUSDC.e)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formattedCreators.map((entry, index) => (
                          <tr
                            key={entry.creatorId}
                            className="border-t border-border/60 odd:bg-muted/20"
                          >
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              #{index + 1}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {formatShortHash(entry.creatorId)}
                            </td>
                            <td className="px-3 py-2">{formatWei(entry.sponsored)}</td>
                            <td className="px-3 py-2">{formatWei(entry.boost)}</td>
                            <td className="px-3 py-2 font-semibold">
                              {formatWei(entry.total)}
                            </td>
                          </tr>
                        ))}
                        {!formattedCreators.length && (
                          <tr>
                            <td
                              className="px-3 py-4 text-center text-muted-foreground"
                              colSpan={5}
                            >
                              No confirmed boosts yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle>Top boosters</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Ranked by total confirmed boosts.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-lg border border-border/60">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Rank</th>
                          <th className="px-3 py-2">Wallet</th>
                          <th className="px-3 py-2">Total boosted (devUSDC.e)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formattedBoosters.map((entry, index) => (
                          <tr
                            key={entry.wallet}
                            className="border-t border-border/60 odd:bg-muted/20"
                          >
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              #{index + 1}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {formatShortHash(entry.wallet)}
                            </td>
                            <td className="px-3 py-2 font-semibold">
                              {formatWei(entry.boost)}
                            </td>
                          </tr>
                        ))}
                        {!formattedBoosters.length && (
                          <tr>
                            <td
                              className="px-3 py-4 text-center text-muted-foreground"
                              colSpan={3}
                            >
                              No confirmed boosters yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
