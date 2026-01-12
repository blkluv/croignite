"use client";

import { getFile, storeFile, useAppDispatch, useAppSelector } from "@/app/store";
import { setMediaFiles, setTracks } from "@/app/store/slices/projectSlice";
import type { MediaFile } from "@/app/types";
import { mimeToExt } from "@/app/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLoadedFfmpeg } from "@/lib/media/ffmpeg";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { InspectorSection } from "./InspectorSection";

function NumberField(props: {
  id: string;
  label: string;
  value: number;
  onChange?: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  readOnly?: boolean;
}) {
  const { id, label, value, onChange, min, max, step, readOnly } = props;
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-white/70">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={
          onChange
            ? (e) => onChange(Number(e.target.value))
            : undefined
        }
        min={min}
        max={max}
        step={step}
        readOnly={readOnly}
        className={cn(
          "border-white/10 bg-black/30 text-white focus-visible:ring-white/30 focus-visible:ring-offset-0",
          readOnly ? "opacity-80" : null,
        )}
      />
    </div>
  );
}

export default function MediaProperties() {
  const { mediaFiles, activeElementIndex, tracks } = useAppSelector(
    (state) => state.projectState,
  );
  const mediaFile = mediaFiles[activeElementIndex];
  const dispatch = useAppDispatch();
  const [isExtracting, setIsExtracting] = useState(false);

  const ids = useMemo(() => {
    const base = mediaFile?.id ?? "none";
    return {
      start: `media-${base}-start`,
      end: `media-${base}-end`,
      sourceStart: `media-${base}-source-start`,
      sourceEnd: `media-${base}-source-end`,
      x: `media-${base}-x`,
      y: `media-${base}-y`,
      width: `media-${base}-w`,
      height: `media-${base}-h`,
      rotation: `media-${base}-rotation`,
      zIndex: `media-${base}-z`,
      opacity: `media-${base}-opacity`,
      blur: `media-${base}-blur`,
      cropX: `media-${base}-crop-x`,
      cropY: `media-${base}-crop-y`,
      cropW: `media-${base}-crop-w`,
      cropH: `media-${base}-crop-h`,
      volume: `media-${base}-volume`,
      speed: `media-${base}-speed`,
    };
  }, [mediaFile?.id]);

  const onUpdateMedia = (id: string, updates: Partial<MediaFile>) => {
    dispatch(
      setMediaFiles(
        mediaFiles.map((media) =>
          media.id === id ? { ...media, ...updates } : media,
        ),
      ),
    );
  };

  const handleSeparateAudio = async () => {
    if (!mediaFile || mediaFile.type !== "video") return;
    setIsExtracting(true);
    try {
      const file = await getFile(mediaFile.fileId);
      if (!file) {
        toast.error("Original file not found");
        return;
      }
      const ffmpeg = await createLoadedFfmpeg();
      const buffer = await file.arrayBuffer();
      const ext =
        mimeToExt[file.type as keyof typeof mimeToExt] ??
        file.type.split("/")[1] ??
        "mp4";
      const inputName = `input.${ext}`;
      await ffmpeg.writeFile(inputName, new Uint8Array(buffer));
      const outputName = "output.m4a";
      await ffmpeg.exec([
        "-i",
        inputName,
        "-vn",
        "-acodec",
        "aac",
        "-b:a",
        "192k",
        outputName,
      ]);
      const data = (await ffmpeg.readFile(outputName)) as Uint8Array;
      ffmpeg.terminate();

      const audioFile = new File(
        [data.buffer],
        `${mediaFile.fileName}-audio.m4a`,
        { type: "audio/mp4" },
      );

      const audioId = crypto.randomUUID();
      await storeFile(audioFile, audioId);

      const audioTrackId = (() => {
        const existing = mediaFiles.find(
          (clip) => clip.type === "audio" && typeof clip.trackId === "string",
        )?.trackId;
        if (existing) return existing;
        const third = tracks[2]?.id;
        if (third) return third;
        const nextId = crypto.randomUUID();
        dispatch(
          setTracks([
            ...tracks,
            { id: nextId, kind: "layer", name: `Layer ${tracks.length + 1}` },
          ]),
        );
        return nextId;
      })();

      const newAudio: MediaFile = {
        ...mediaFile,
        id: crypto.randomUUID(),
        fileId: audioId,
        src: URL.createObjectURL(audioFile),
        type: "audio",
        trackId: audioTrackId,
        playbackSpeed: mediaFile.playbackSpeed || 1,
        volume: mediaFile.volume ?? 100,
        positionStart: mediaFile.positionStart,
        positionEnd: mediaFile.positionEnd,
        startTime: mediaFile.startTime,
        endTime: mediaFile.endTime,
      };

      dispatch(setMediaFiles([...mediaFiles, newAudio]));
      toast.success("Audio track created");
    } catch (error) {
      console.error("Separate audio failed", error);
      toast.error("Unable to separate audio");
    } finally {
      setIsExtracting(false);
    }
  };

  if (!mediaFile) return null;

  const isVisual = mediaFile.type === "video" || mediaFile.type === "image";
  const isAudio = mediaFile.type === "video" || mediaFile.type === "audio";

  const crop = mediaFile.crop ?? {
    x: 0,
    y: 0,
    width: mediaFile.width ?? 0,
    height: mediaFile.height ?? 0,
  };

  const timelineDuration = Math.max(0, mediaFile.positionEnd - mediaFile.positionStart);
  const sourceDuration = Math.max(0, mediaFile.endTime - mediaFile.startTime);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-white">
            {mediaFile.fileName}
          </div>
          <div className="text-xs text-white/50">
            {mediaFile.type.toUpperCase()} · {timelineDuration.toFixed(2)}s on
            timeline · {sourceDuration.toFixed(2)}s source
          </div>
        </div>
      </div>

      <InspectorSection
        title="Timing"
        description="Timeline placement and source trim."
      >
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            id={ids.start}
            label="Start (s)"
            value={mediaFile.positionStart}
            min={0}
            step={0.1}
            onChange={(next) =>
              onUpdateMedia(mediaFile.id, {
                positionStart: next,
                positionEnd: next + timelineDuration,
              })
            }
          />
          <NumberField
            id={ids.end}
            label="End (s)"
            value={mediaFile.positionEnd}
            readOnly
          />
          <NumberField
            id={ids.sourceStart}
            label="Source in (s)"
            value={mediaFile.startTime}
            readOnly
          />
          <NumberField
            id={ids.sourceEnd}
            label="Source out (s)"
            value={mediaFile.endTime}
            readOnly
          />
        </div>
      </InspectorSection>

      {isVisual ? (
        <InspectorSection title="Transform" description="Position, size, and rotation.">
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              id={ids.x}
              label="X"
              value={mediaFile.x ?? 0}
              step={10}
              onChange={(next) => onUpdateMedia(mediaFile.id, { x: next })}
            />
            <NumberField
              id={ids.y}
              label="Y"
              value={mediaFile.y ?? 0}
              step={10}
              onChange={(next) => onUpdateMedia(mediaFile.id, { y: next })}
            />
            <NumberField
              id={ids.width}
              label="Width"
              value={mediaFile.width ?? 0}
              step={10}
              onChange={(next) => onUpdateMedia(mediaFile.id, { width: next })}
            />
            <NumberField
              id={ids.height}
              label="Height"
              value={mediaFile.height ?? 0}
              step={10}
              onChange={(next) => onUpdateMedia(mediaFile.id, { height: next })}
            />
            <NumberField
              id={ids.rotation}
              label="Rotation (°)"
              value={mediaFile.rotation ?? 0}
              step={1}
              onChange={(next) => onUpdateMedia(mediaFile.id, { rotation: next })}
            />
            <NumberField
              id={ids.zIndex}
              label="Layer (z-index)"
              value={mediaFile.zIndex ?? 0}
              step={1}
              onChange={(next) => onUpdateMedia(mediaFile.id, { zIndex: next })}
            />
          </div>
        </InspectorSection>
      ) : null}

      {isVisual ? (
        <InspectorSection title="Crop" description="Visible bounds of the frame.">
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              id={ids.cropX}
              label="Crop X"
              value={crop.x ?? 0}
              step={10}
              onChange={(next) =>
                onUpdateMedia(mediaFile.id, { crop: { ...crop, x: next } })
              }
            />
            <NumberField
              id={ids.cropY}
              label="Crop Y"
              value={crop.y ?? 0}
              step={10}
              onChange={(next) =>
                onUpdateMedia(mediaFile.id, { crop: { ...crop, y: next } })
              }
            />
            <NumberField
              id={ids.cropW}
              label="Crop width"
              value={crop.width ?? mediaFile.width ?? 0}
              step={10}
              onChange={(next) =>
                onUpdateMedia(mediaFile.id, { crop: { ...crop, width: next } })
              }
            />
            <NumberField
              id={ids.cropH}
              label="Crop height"
              value={crop.height ?? mediaFile.height ?? 0}
              step={10}
              onChange={(next) =>
                onUpdateMedia(mediaFile.id, { crop: { ...crop, height: next } })
              }
            />
          </div>
        </InspectorSection>
      ) : null}

      {isVisual ? (
        <InspectorSection title="Effects" description="Opacity and blur.">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={ids.opacity} className="text-xs text-white/70">
                  Opacity
                </Label>
                <div className="text-xs tabular-nums text-white/60">
                  {(mediaFile.opacity ?? 100).toFixed(0)}%
                </div>
              </div>
              <input
                id={ids.opacity}
                type="range"
                min={0}
                max={100}
                step={1}
                value={mediaFile.opacity ?? 100}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, { opacity: Number(e.target.value) })
                }
                className="w-full accent-white"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={ids.blur} className="text-xs text-white/70">
                  Blur
                </Label>
                <div className="text-xs tabular-nums text-white/60">
                  {(mediaFile.blur ?? 0).toFixed(0)}px
                </div>
              </div>
              <input
                id={ids.blur}
                type="range"
                min={0}
                max={20}
                step={1}
                value={mediaFile.blur ?? 0}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, { blur: Number(e.target.value) })
                }
                className="w-full accent-white"
              />
            </div>
          </div>
        </InspectorSection>
      ) : null}

      {isAudio ? (
        <InspectorSection title="Audio" description="Volume and speed.">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={ids.volume} className="text-xs text-white/70">
                  Volume
                </Label>
                <div className="text-xs tabular-nums text-white/60">
                  {(mediaFile.volume ?? 100).toFixed(0)}%
                </div>
              </div>
              <input
                id={ids.volume}
                type="range"
                min={0}
                max={100}
                step={1}
                value={mediaFile.volume ?? 100}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, { volume: Number(e.target.value) })
                }
                className="w-full accent-white"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={ids.speed} className="text-xs text-white/70">
                  Playback speed
                </Label>
                <div className="text-xs tabular-nums text-white/60">
                  {(mediaFile.playbackSpeed ?? 1).toFixed(1)}x
                </div>
              </div>
              <input
                id={ids.speed}
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={mediaFile.playbackSpeed ?? 1}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, {
                    playbackSpeed: Number(e.target.value),
                  })
                }
                className="w-full accent-white"
              />
            </div>

            {mediaFile.type === "video" ? (
              <Button
                type="button"
                variant="secondary"
                disabled={isExtracting}
                onClick={handleSeparateAudio}
                className="w-full"
              >
                {isExtracting ? "Extracting audio…" : "Separate audio track"}
              </Button>
            ) : null}
          </div>
        </InspectorSection>
      ) : null}
    </div>
  );
}
