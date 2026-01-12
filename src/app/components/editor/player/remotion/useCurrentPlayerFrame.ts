"use client";

import type { PlayerRef } from "@remotion/player";
import { useCallback, useSyncExternalStore } from "react";

export function useCurrentPlayerFrame(player: PlayerRef | null) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!player) return () => undefined;
      const handleFrameUpdate = () => onStoreChange();
      player.addEventListener("frameupdate", handleFrameUpdate);
      return () => player.removeEventListener("frameupdate", handleFrameUpdate);
    },
    [player],
  );

  return useSyncExternalStore(
    subscribe,
    () => player?.getCurrentFrame() ?? 0,
    () => 0,
  );
}

