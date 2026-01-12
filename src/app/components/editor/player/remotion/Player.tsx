import { CanvasPlayer } from "./CanvasPlayer";
import { useAppSelector, useAppDispatch } from "@/app/store";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  setCurrentTime,
  setIsMuted,
  setIsPlaying,
} from "@/app/store/slices/projectSlice";
import MoveableOverlay from "./MoveableOverlay";
import { useEditorPlayer } from "./EditorPlayerContext";
import { Button } from "@/components/ui/button";
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCurrentPlayerFrame } from "./useCurrentPlayerFrame";
import { cn } from "@/lib/utils";

export const PreviewPlayer = () => {
  const {
    duration,
    currentTime,
    isPlaying,
    isMuted,
    fps,
    resolution,
    mediaFiles,
    textElements,
  } = useAppSelector((state) => state.projectState);
  const { playerRef, player, registerPlayer } = useEditorPlayer();
  const dispatch = useAppDispatch();
  const fullscreenRef = useRef<HTMLDivElement | null>(null);
  const safeFps =
    typeof fps === "number" && Number.isFinite(fps) && fps > 0 ? fps : 30;
  const playerFrame = useCurrentPlayerFrame(player);
  const safeCurrentTime =
    typeof currentTime === "number" && Number.isFinite(currentTime)
      ? Math.max(0, currentTime)
      : 0;
  const playheadTime = !player || !isPlaying ? safeCurrentTime : playerFrame / safeFps;
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hasSyncedInitialFrameRef = useRef(false);

  const durationSeconds = useMemo(() => {
    const safe = typeof duration === "number" && Number.isFinite(duration) ? duration : 0;
    return Math.max(0, safe);
  }, [duration]);

  const durationInFrames = useMemo(() => {
    const safeDurationSeconds = Math.max(0, durationSeconds);
    return Math.floor((safeDurationSeconds > 0 ? safeDurationSeconds : 1) * safeFps) + 1;
  }, [durationSeconds, safeFps]);

  const initialFrame = useMemo(() => {
    const desired = Math.round(safeCurrentTime * safeFps);
    return Math.max(0, Math.min(durationInFrames - 1, desired));
  }, [durationInFrames, safeCurrentTime, safeFps]);

  // update frame when current time with marker
  useEffect(() => {
    if (!player || isPlaying) return;
    const desiredFrame = Math.max(
      0,
      Math.min(durationInFrames - 1, Math.round(safeCurrentTime * safeFps)),
    );
    player.pause();
    const currentFrame = player.getCurrentFrame();
    if (!hasSyncedInitialFrameRef.current || currentFrame !== desiredFrame) {
      player.seekTo(desiredFrame);
      hasSyncedInitialFrameRef.current = true;
    }
  }, [durationInFrames, isPlaying, player, safeCurrentTime, safeFps]);

  useEffect(() => {
    if (!player) return;

    const handlePlay = () => dispatch(setIsPlaying(true));
    const handlePause = () => {
      dispatch(setIsPlaying(false));
      const frame = player.getCurrentFrame();
      dispatch(setCurrentTime(frame / safeFps));
    };

    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);
    return () => {
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
    };
  }, [dispatch, player, safeFps]);

  // to control with keyboard
  useEffect(() => {
    if (!player) return;
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isPlaying, player]);

  useEffect(() => {
    if (!player) return;
    if (isMuted) {
      player.mute();
    } else {
      player.unmute();
    }
  }, [isMuted, player]);

  useEffect(() => {
    if (!player) return;
    const value = player.getVolume();
    if (Number.isFinite(value)) setVolume(value);
  }, [player]);

  useEffect(() => {
    const update = () => {
      const isContainerFullscreen =
        document.fullscreenElement === fullscreenRef.current;
      const isPlayerFullscreen = playerRef.current?.isFullscreen() ?? false;
      setIsFullscreen(isContainerFullscreen || isPlayerFullscreen);
    };
    update();
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, [playerRef]);

  const baseCompositionWidth =
    typeof resolution?.width === "number" && Number.isFinite(resolution.width) && resolution.width > 0
      ? resolution.width
      : 1920;
  const baseCompositionHeight =
    typeof resolution?.height === "number" && Number.isFinite(resolution.height) && resolution.height > 0
      ? resolution.height
      : 1080;

  const previewScale = useMemo(() => {
    const maxPreviewWidth = 1280;
    const maxPreviewHeight = 720;
    const scale = Math.min(
      1,
      maxPreviewWidth / baseCompositionWidth,
      maxPreviewHeight / baseCompositionHeight,
    );
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }, [baseCompositionHeight, baseCompositionWidth]);

  const compositionInputProps = useMemo(
    () => ({ mediaFiles, textElements, renderScale: previewScale }),
    [mediaFiles, previewScale, textElements],
  );

  const compositionWidth = Math.max(1, Math.round(baseCompositionWidth * previewScale));
  const compositionHeight = Math.max(1, Math.round(baseCompositionHeight * previewScale));

  const formatTime = (seconds: number) => {
    const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const rounded = Math.floor(safe);
    const minutes = Math.floor(rounded / 60);
    const rem = rounded % 60;
    return `${minutes}:${rem.toString().padStart(2, "0")}`;
  };

  const toggleFullscreen = async () => {
    const el = fullscreenRef.current;
    if (!el) return;

    try {
      const fullscreenElement = document.fullscreenElement;
      const player = playerRef.current;
      const isThisFullscreen =
        fullscreenElement === el || (player?.isFullscreen() ?? false);

      if (isThisFullscreen) {
        if (fullscreenElement) {
          await document.exitFullscreen?.();
        } else {
          player?.exitFullscreen();
        }
        return;
      }

      if (fullscreenElement && fullscreenElement !== el) {
        await document.exitFullscreen?.();
      }

      await el.requestFullscreen?.();
    } catch {
      const player = playerRef.current;
      try {
        if (!player) return;
        if (player.isFullscreen()) player.exitFullscreen();
        else player.requestFullscreen();
      } catch {
        // no-op: fullscreen is best-effort
      }
    }
  };

  return (
    <div
      ref={fullscreenRef}
      className={cn(
        "flex w-full flex-col bg-black",
        isFullscreen ? "h-[100dvh]" : "h-full",
      )}
    >
      <div className="relative min-h-0 flex-1">
        <CanvasPlayer
          ref={registerPlayer}
          inputProps={compositionInputProps}
          durationInFrames={durationInFrames}
          compositionWidth={compositionWidth}
          compositionHeight={compositionHeight}
          fps={safeFps}
          initialFrame={initialFrame}
        />
        <MoveableOverlay />
      </div>

      <div className="border-t border-white/10 bg-black/60 px-3 py-2">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => dispatch(setIsPlaying(!isPlaying))}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => {
              dispatch(setIsMuted(!isMuted));
            }}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const player = playerRef.current;
              const next = Number(e.target.value);
              if (!player || !Number.isFinite(next)) return;
              player.setVolume(next);
              setVolume(next);
              if (next > 0 && player.isMuted()) dispatch(setIsMuted(false));
            }}
            className="h-2 w-24 cursor-pointer accent-white/80"
            aria-label="Playback volume"
          />

          <div className="flex items-center gap-2 text-xs tabular-nums text-white/70">
            <span>{formatTime(playheadTime)}</span>
            <span className="text-white/30">/</span>
            <span>{formatTime(durationSeconds)}</span>
          </div>

          <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={Math.max(0, durationSeconds)}
            step={1 / safeFps}
            value={Math.min(durationSeconds, playheadTime)}
            onChange={(e) => {
              const nextTime = Number(e.target.value);
              if (!player || !Number.isFinite(nextTime)) return;
              dispatch(setIsPlaying(false));
              dispatch(setCurrentTime(nextTime));
              player.seekTo(Math.round(nextTime * safeFps));
            }}
            className="h-2 w-full cursor-pointer accent-white/80"
            aria-label="Seek"
          />
          </div>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => {
              void toggleFullscreen();
            }}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
