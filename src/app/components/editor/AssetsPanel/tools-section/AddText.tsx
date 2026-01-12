"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { setTextElements } from "@/app/store/slices/projectSlice";
import type { TextElement } from "@/app/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

type PlacementMode = "playhead" | "append";
type Preset = "title" | "subtitle" | "lower-third" | "caption";

const DEFAULT_DURATION_SECONDS = 8;

export default function AddTextPanel() {
  const dispatch = useAppDispatch();
  const { textElements, currentTime, duration, resolution, tracks } = useAppSelector(
    (state) => state.projectState,
  );

  const [text, setText] = useState("New text");
  const [placement, setPlacement] = useState<PlacementMode>("playhead");

  const baseStart = useMemo(() => {
    const playhead = Number.isFinite(currentTime) ? currentTime : 0;
    const append = Number.isFinite(duration) ? duration : 0;
    return Math.max(0, placement === "append" ? append : playhead);
  }, [currentTime, duration, placement]);

  const frameWidth = resolution?.width ?? 1920;
  const frameHeight = resolution?.height ?? 1080;
  const insetX = Math.round(frameWidth * 0.08);
  const overlayVideoTrackId = tracks[1]?.id ?? tracks[0]?.id ?? undefined;

  const addPreset = (preset: Preset) => {
    const start = baseStart;
    const end = start + DEFAULT_DURATION_SECONDS;
    const nextText = text.trim() || "New text";

    const common: Omit<TextElement, "x" | "y"> = {
      id: crypto.randomUUID(),
      text: nextText,
      positionStart: start,
      positionEnd: end,
      width: frameWidth - insetX * 2,
      height: 240,
      font: "Inter",
      fontSize: 96,
      color: "#ffffff",
      backgroundColor: "transparent",
      align: "center",
      zIndex: 0,
      opacity: 100,
      rotation: 0,
      fadeInDuration: 0.25,
      fadeOutDuration: 0.25,
      animation: "fade",
      blur: 0,
      includeInMerge: true,
    };

    const presetFields = (() => {
      switch (preset) {
        case "lower-third":
          return {
            x: insetX,
            y: Math.round(frameHeight * 0.72),
            width: Math.round(frameWidth * 0.52),
            height: 220,
            fontSize: 64,
            align: "left" as const,
          };
        case "caption":
          return {
            x: insetX,
            y: Math.round(frameHeight * 0.82),
            height: 220,
            fontSize: 52,
            align: "center" as const,
          };
        case "subtitle":
          return {
            x: insetX,
            y: Math.round(frameHeight * 0.3),
            height: 220,
            fontSize: 64,
            align: "center" as const,
          };
        case "title":
        default:
          return {
            x: insetX,
            y: Math.round(frameHeight * 0.18),
            height: 260,
            fontSize: 96,
            align: "center" as const,
          };
      }
    })();

    const nextElement: TextElement = {
      ...common,
      ...presetFields,
      trackId: overlayVideoTrackId,
    };

    dispatch(setTextElements([...textElements, nextElement]));
    toast.success("Text added to timeline.");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-white">Text</h2>
        <p className="text-xs text-white/50">
          Add titles and captions. Fine-tune styles in Properties.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/70">
            Default text
          </label>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="New text…"
            className="border-white/10 bg-black/30 text-white placeholder:text-white/40 focus-visible:ring-white/30 focus-visible:ring-offset-0"
            aria-label="Text to insert"
          />
        </div>

        <TooltipProvider delayDuration={250}>
          <div className="flex flex-wrap items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant={placement === "playhead" ? "secondary" : "ghost"}
                  onClick={() => setPlacement("playhead")}
                  className={cn(
                    "h-8 rounded-full px-3",
                    placement === "playhead"
                      ? null
                      : "text-white/70 hover:text-white",
                  )}
                >
                  At playhead
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                Inserts the text clip at the current playhead time.
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant={placement === "append" ? "secondary" : "ghost"}
                  onClick={() => setPlacement("append")}
                  className={cn(
                    "h-8 rounded-full px-3",
                    placement === "append" ? null : "text-white/70 hover:text-white",
                  )}
                >
                  Append
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                Inserts after the end of the current edit.
              </TooltipContent>
            </Tooltip>

            <div className="ml-auto flex items-center gap-2 text-xs text-white/50">
              <span>Start: {baseStart.toFixed(1)}s</span>
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/60 hover:bg-black/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                    aria-label="Text placement help"
                  >
                    <Info className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-lg border-white/10 bg-black/90 text-white">
                  <DialogHeader>
                    <DialogTitle>Text placement</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 text-sm text-white/70">
                    <p>
                      <span className="font-medium text-white">At playhead</span>{" "}
                      inserts the new text clip at the red playhead time.
                    </p>
                    <p>
                      <span className="font-medium text-white">Append</span>{" "}
                      places it after the end of the current edit.
                    </p>
                    <p>
                      All templates default to{" "}
                      <span className="font-medium text-white">
                        {DEFAULT_DURATION_SECONDS}s
                      </span>
                      . Drag or trim the clip on the timeline to adjust duration.
                    </p>
                    <p>Double-click text on the canvas to edit it inline.</p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </TooltipProvider>

        <TooltipProvider delayDuration={250}>
          <div className="grid grid-cols-2 gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => addPreset("title")}
                >
                  Title
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                Big centered title, editable on canvas.
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => addPreset("subtitle")}
                >
                  Subtitle
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                Smaller line under a title (great for context).
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => addPreset("lower-third")}
                >
                  Lower third
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                Left-aligned name + descriptor style.
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => addPreset("caption")}
                >
                  Caption
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                Bottom caption style for spoken lines.
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
        <p className="text-xs text-white/60">
          Tip: select a text clip to edit font, color, animation, and timing in
          the timeline.
        </p>
      </div>
    </div>
  );
}
