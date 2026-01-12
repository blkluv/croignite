import Link from "next/link";
import IgniteChat from "./ignite-chat";
import MainLayout from "@/app/layouts/MainLayout";
import PageShell from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function IgnitePage() {
  return (
    <MainLayout>
      <PageShell
        eyebrow="Crypto.com AI Agent"
        title="CroIgnite Copilot"
        description="Ask questions about Cronos testnet activity, decode wallet behavior, and shape sponsorship plans before settling via x402."
        actions={
          <>
            <Badge variant="warning">Cronos Testnet</Badge>
            <Badge variant="success">x402 Ready</Badge>
            <Button asChild variant="outline" className="border-border/60">
              <Link href="/x402-demo">View x402 Demo</Link>
            </Button>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="border-border/60 bg-card/80 p-6 shadow-sm">
            <IgniteChat />
          </Card>
          <div className="space-y-4">
            <Card className="border-border/60 bg-card/80 p-4 shadow-sm">
              <div className="text-sm font-semibold text-foreground">Copilot focuses on</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Cronos testnet insights (blocks, transfers, balances)</li>
                <li>• Sponsorship planning and pacing recommendations</li>
                <li>• x402 flow explanations and next-step guidance</li>
              </ul>
            </Card>
            <Card className="border-border/60 bg-card/80 p-4 shadow-sm">
              <div className="text-sm font-semibold text-foreground">Quick actions</div>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <Link className="text-[color:var(--brand-accent-text)] hover:underline" href="/">
                  Open the feed
                </Link>
                <Link className="text-[color:var(--brand-accent-text)] hover:underline" href="/activity">
                  Review on-chain activity
                </Link>
                <Link className="text-[color:var(--brand-accent-text)] hover:underline" href="/leaderboard">
                  Check creator momentum
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </PageShell>
    </MainLayout>
  );
}
