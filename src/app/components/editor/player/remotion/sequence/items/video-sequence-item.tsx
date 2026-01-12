import React from "react";
import { Video } from "@remotion/media";
import { AbsoluteFill, Sequence } from "remotion";
import { MediaFile } from "@/app/types";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { setActiveElement, setActiveElementIndex } from "@/app/store/slices/projectSlice";
import { calculateSequenceFrames, clampNumber, secondsToFrames } from "../timing";

interface SequenceItemOptions {
  handleTextChange?: (id: string, text: string) => void;
  fps: number;
  renderScale: number;
  editableTextId?: string | null;
  currentTime?: number;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

interface VideoSequenceItemProps {
  item: MediaFile;
  options: SequenceItemOptions;
}

export const VideoSequenceItem: React.FC<VideoSequenceItemProps> = ({
  item,
  options,
}) => {
  const { fps, renderScale } = options;
  const dispatch = useAppDispatch();
  const { tracks, mediaFiles, activeElement, activeElementIndex } = useAppSelector(
    (state) => state.projectState,
  );

  const safeRenderScale =
    isFiniteNumber(renderScale) && renderScale > 0 ? renderScale : 1;

  const isSelected =
    activeElement === "media" && mediaFiles[activeElementIndex]?.id === item.id;

  const trackIndex = (() => {
    if (!item.trackId) return 0;
    const idx = tracks.findIndex((t) => t.id === item.trackId);
    return idx >= 0 ? idx : 0;
  })();

  const effectiveZIndex = trackIndex * 1000 + (item.zIndex ?? 0);

  const playbackRate =
    isFiniteNumber(item.playbackSpeed) && item.playbackSpeed > 0
      ? item.playbackSpeed
      : 1;
  const { from, durationInFrames: unclampedDurationInFrames } = calculateSequenceFrames(
    {
      from: item.positionStart,
      to: item.positionEnd,
    },
    fps,
  );

  const crop = item.crop || {
    x: 0,
    y: 0,
    width: item.width,
    height: item.height,
  };

  const cropBoundsWidth = isFiniteNumber(crop.width) ? crop.width : item.width;
  const cropBoundsHeight = isFiniteNumber(crop.height) ? crop.height : item.height;
  const scaledBoundsWidth =
    isFiniteNumber(cropBoundsWidth) && cropBoundsWidth > 0
      ? cropBoundsWidth * safeRenderScale
      : undefined;
  const scaledBoundsHeight =
    isFiniteNumber(cropBoundsHeight) && cropBoundsHeight > 0
      ? cropBoundsHeight * safeRenderScale
      : undefined;
  const scaledItemWidth =
    isFiniteNumber(item.width) && item.width > 0 ? item.width * safeRenderScale : undefined;
  const scaledItemHeight =
    isFiniteNumber(item.height) && item.height > 0 ? item.height * safeRenderScale : undefined;
  const scaledCropX = (isFiniteNumber(crop.x) ? crop.x : 0) * safeRenderScale;
  const scaledCropY = (isFiniteNumber(crop.y) ? crop.y : 0) * safeRenderScale;
  const scaledBlur =
    isFiniteNumber(item.blur) && item.blur > 0 ? item.blur * safeRenderScale : 0;
  const scaledX = (isFiniteNumber(item.x) ? item.x : 0) * safeRenderScale;
  const scaledY = (isFiniteNumber(item.y) ? item.y : 0) * safeRenderScale;

  const safeStartTime = isFiniteNumber(item.startTime) ? Math.max(0, item.startTime) : 0;
  const safeEndTime = isFiniteNumber(item.endTime) ? Math.max(safeStartTime, item.endTime) : safeStartTime;
  const safeSourceDurationSeconds =
    isFiniteNumber(item.sourceDurationSeconds) && item.sourceDurationSeconds > 0
      ? item.sourceDurationSeconds
      : safeEndTime;
  const sourceDurationFramesRaw = secondsToFrames(safeSourceDurationSeconds, fps);
  const trimBeforeRaw = secondsToFrames(safeStartTime, fps);
  const trimAfterRaw = secondsToFrames(safeEndTime, fps);
  const safeSourceDurationFrames = Math.max(
    trimAfterRaw,
    sourceDurationFramesRaw,
    trimBeforeRaw + 1,
  );
  const trimBefore = clampNumber(trimBeforeRaw, 0, Math.max(0, safeSourceDurationFrames - 1));
  const trimAfter = clampNumber(trimAfterRaw, trimBefore + 1, safeSourceDurationFrames);

  const maxTimelineFramesByTrim = Math.max(
    1,
    Math.floor((trimAfter - trimBefore) / playbackRate),
  );
  const durationInFrames = Math.min(unclampedDurationInFrames, maxTimelineFramesByTrim);

  const src = typeof item.src === "string" ? item.src : "";
  if (!src) return null;

  const volume = isFiniteNumber(item.volume) ? clampNumber(item.volume / 100, 0, 1) : 1;

  return (
    <Sequence
      key={item.id}
      from={from}
      durationInFrames={durationInFrames}
      style={{ pointerEvents: "none" }}
    >
      <AbsoluteFill
        data-track-item="transition-element"
        className={`designcombo-scene-item id-${item.id} designcombo-scene-item-type-${item.type}`}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (isSelected) return;
          dispatch(setActiveElement("media"));
          const index = mediaFiles.findIndex((clip) => clip.id === item.id);
          if (index >= 0) dispatch(setActiveElementIndex(index));
        }}
        style={{
          pointerEvents: "auto",
          top: scaledY,
          left: scaledX,
          width: scaledBoundsWidth ?? "100%",
          height: scaledBoundsHeight ?? "auto",
          transform:
            typeof item.rotation === "number" && Number.isFinite(item.rotation) && item.rotation !== 0
              ? `rotate(${item.rotation}deg)`
              : "none",
          transformOrigin: "center center",
          zIndex: effectiveZIndex,
          opacity: item?.opacity !== undefined ? item.opacity / 100 : 1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: scaledBoundsWidth ?? "100%",
            height: scaledBoundsHeight ?? "auto",
            position: "relative",
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <Video
            trimBefore={trimBefore}
            trimAfter={trimAfter}
            playbackRate={playbackRate}
            src={src}
            volume={volume}
            style={{
              pointerEvents: "none",
              top: -scaledCropY,
              left: -scaledCropX,
              width: scaledItemWidth ?? "100%", // Default width
              height: scaledItemHeight ?? "auto", // Default height
              position: "absolute",
              filter: scaledBlur > 0 ? `blur(${scaledBlur}px)` : "none",
            }}
          />
        </div>
      </AbsoluteFill>
    </Sequence>
  );
};
