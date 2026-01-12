import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FlowKey = "yield" | "boost" | "sponsor";

type FlowLegendProps = {
  active?: FlowKey;
};

const flows: Array<{
  key: FlowKey;
  title: string;
  description: string;
  href: string;
}> = [
  {
    key: "yield",
    title: "Yield vault",
    description:
      "Personal devUSDC.e vault. Earn yield from protocol revenue and strategy returns.",
    href: "/yield",
  },
  {
    key: "boost",
    title: "Boost vault",
    description:
      "Creator-directed vault. Your principal stays withdrawable while boosts unlock perks.",
    href: "/creators",
  },
  {
    key: "sponsor",
    title: "Sponsor a clip",
    description:
      "Clip-specific invoice. Mints a receipt NFT and routes fees into yield.",
    href: "/",
  },
];

export default function FlowLegend({ active }: FlowLegendProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>RealFi flows</CardTitle>
        <CardDescription>
          Yield is global, boost is creator-specific, and sponsor is per-clip.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          {flows.map((flow) => {
            const isActive = flow.key === active;
            return (
              <Link
                key={flow.key}
                href={flow.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group rounded-xl border border-border/60 bg-muted/10 p-4 transition hover:border-[color:var(--brand-accent)] hover:bg-[color:var(--brand-accent-soft)]",
                  isActive &&
                    "border-[color:var(--brand-accent)] bg-[color:var(--brand-accent-soft)]",
                )}
              >
                <div className="text-sm font-semibold text-foreground">
                  {flow.title}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {flow.description}
                </div>
                {isActive && (
                  <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--brand-accent-strong)]">
                    You are here
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
