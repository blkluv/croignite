"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
};

export function InspectorSection({
  title,
  description,
  defaultOpen = true,
  children,
  className,
}: Props) {
  return (
    <details
      open={defaultOpen}
      className={cn("group rounded-xl border border-white/10 bg-black/20", className)}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-0 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 space-y-0.5">
          <div className="text-sm font-semibold text-white">{title}</div>
          {description ? (
            <div className="text-xs text-white/50">{description}</div>
          ) : null}
        </div>
        <ChevronRight
          className="mt-0.5 h-4 w-4 shrink-0 text-white/60 transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-white/10 p-4">{children}</div>
    </details>
  );
}

