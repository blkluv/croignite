"use client";

import { FiPause } from "react-icons/fi";
import { cn } from "@/lib/utils";

type VideoStatusOverlayProps = {
  isBuffering: boolean;
  isPaused: boolean;
  className?: string;
};

export function VideoStatusOverlay({
  isBuffering,
  isPaused,
  className,
}: VideoStatusOverlayProps) {
  if (!isBuffering && !isPaused) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center",
        className,
      )}
      aria-hidden="true"
    >
      {isBuffering ? (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        </div>
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white">
          <FiPause className="h-8 w-8" />
        </div>
      )}
    </div>
  );
}
