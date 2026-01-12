import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type WalletGateSkeletonProps = {
  cards?: number;
  className?: string;
};

export default function WalletGateSkeleton({
  cards = 2,
  className,
}: WalletGateSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)} aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4">
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={`wallet-skeleton-${index}`}
            className="rounded-2xl border border-border/60 bg-muted/10 p-4"
          >
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-5/6" />
            <Skeleton className="mt-4 h-8 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
