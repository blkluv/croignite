import X402DemoClient from "./x402-demo-client";
import MainLayout from "@/app/layouts/MainLayout";
import PageShell from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function Page() {
  return (
    <MainLayout>
      <PageShell
        eyebrow="HTTP 402 Settlement"
        title="x402 Sponsor Demo"
        description="Trigger the exact seller flow: 402 → sign EIP-712 → settle via the Cronos facilitator. This hits devUSDC.e on Cronos Testnet."
        actions={<Badge variant="warning">Cronos Testnet</Badge>}
      >
        <Card className="border-border/60 bg-card/80 p-6 shadow-sm">
          <X402DemoClient />
        </Card>
      </PageShell>
    </MainLayout>
  );
}
