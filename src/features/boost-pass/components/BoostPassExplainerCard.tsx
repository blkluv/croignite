"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { BoostPassEpoch } from "@/app/types";

type BoostPassExplainerCardProps = {
  latestEpoch: BoostPassEpoch | null;
};

const resolvePublishIntervalHours = () => {
  const raw = process.env.NEXT_PUBLIC_BOOST_PASS_EPOCH_INTERVAL_HOURS;
  const parsed = raw ? Number(raw) : 24;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
};

export default function BoostPassExplainerCard({
  latestEpoch,
}: BoostPassExplainerCardProps) {
  const intervalHours = resolvePublishIntervalHours();
  const intervalMs = intervalHours * 60 * 60 * 1000;
  const lastPublishedAt = latestEpoch?.publishedAt
    ? new Date(latestEpoch.publishedAt)
    : null;
  const nextPublishAt = lastPublishedAt
    ? new Date(lastPublishedAt.getTime() + intervalMs)
    : null;

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Boost Pass guide</CardTitle>
          <Badge variant="outline">Auto publish</Badge>
        </div>
        <CardDescription>
          Boost Pass rewards are published on-chain automatically on a fixed cadence.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
            <span>Publish cadence</span>
            <span>Every {intervalHours}h</span>
          </div>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <div>
              Last publish:{" "}
              <span className="text-foreground">
                {lastPublishedAt ? lastPublishedAt.toLocaleString() : "Not published yet"}
              </span>
            </div>
            <div>
              Next publish:{" "}
              <span className="text-foreground">
                {nextPublishAt ? nextPublishAt.toLocaleString() : "Pending first publish"}
              </span>
            </div>
          </div>
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem value="pass">
            <AccordionTrigger>What is a Boost Pass</AccordionTrigger>
            <AccordionContent>
              A Boost Pass is a non-transferable on-chain badge earned by top boosters. It proves
              your wallet earned the reward and unlocks remix packs.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="epoch">
            <AccordionTrigger>What is an epoch</AccordionTrigger>
            <AccordionContent>
              An epoch is a reward round. We snapshot the leaderboard for that round, publish the
              results on-chain, and then eligible wallets can claim.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="claim">
            <AccordionTrigger>Why you might be waiting to claim</AccordionTrigger>
            <AccordionContent>
              If you are on the latest top boosters list but the epoch is not published yet, the
              claim button stays locked until the next publish window completes.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="perks">
            <AccordionTrigger>What you unlock</AccordionTrigger>
            <AccordionContent>
              Boost Pass holders can download exclusive remix packs and import them into Projects.
              <div className="mt-2">
                <Link className="underline underline-offset-2" href="/perks/boost-pass">
                  View Boost Pass perks
                </Link>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
