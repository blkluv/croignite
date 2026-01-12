import React from "react";
import { AbsoluteFill, Img, Sequence } from "remotion";
import { MediaFile } from "@/app/types";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { setActiveElement, setActiveElementIndex } from "@/app/store/slices/projectSlice";
import { calculateSequenceFrames } from "../timing";

interface SequenceItemOptions {
  handleTextChange?: (id: string, text: string) => void;
  fps: number;
  renderScale: number;
  editableTextId?: string | null;
  currentTime?: number;
}

interface ImageSequenceItemProps {
  item: MediaFile;
  options: SequenceItemOptions;
}

export const ImageSequenceItem: React.FC<ImageSequenceItemProps> = ({
  item,
  options,
}) => {
  const { fps, renderScale } = options;
  const dispatch = useAppDispatch();
  const { tracks, mediaFiles, activeElement, activeElementIndex } = useAppSelector(
    (state) => state.projectState,
  );

  const safeRenderScale =
    typeof renderScale === "number" && Number.isFinite(renderScale) && renderScale > 0
      ? renderScale
      : 1;

  const isSelected =
    activeElement === "media" && mediaFiles[activeElementIndex]?.id === item.id;

  const trackIndex = (() => {
    if (!item.trackId) return 0;
    const idx = tracks.findIndex((t) => t.id === item.trackId);
    return idx >= 0 ? idx : 0;
  })();

  const effectiveZIndex = trackIndex * 1000 + (item.zIndex ?? 0);

  const { from, durationInFrames } = calculateSequenceFrames(
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

  const cropBoundsWidth = typeof crop.width === "number" ? crop.width : item.width;
  const cropBoundsHeight = typeof crop.height === "number" ? crop.height : item.height;
  const scaledBoundsWidth =
    typeof cropBoundsWidth === "number" && Number.isFinite(cropBoundsWidth) && cropBoundsWidth > 0
      ? cropBoundsWidth * safeRenderScale
      : undefined;
  const scaledBoundsHeight =
    typeof cropBoundsHeight === "number" && Number.isFinite(cropBoundsHeight) && cropBoundsHeight > 0
      ? cropBoundsHeight * safeRenderScale
      : undefined;
  const scaledItemWidth =
    typeof item.width === "number" && Number.isFinite(item.width) && item.width > 0
      ? item.width * safeRenderScale
      : undefined;
  const scaledItemHeight =
    typeof item.height === "number" && Number.isFinite(item.height) && item.height > 0
      ? item.height * safeRenderScale
      : undefined;
  const scaledCropX =
    (typeof crop.x === "number" && Number.isFinite(crop.x) ? crop.x : 0) * safeRenderScale;
  const scaledCropY =
    (typeof crop.y === "number" && Number.isFinite(crop.y) ? crop.y : 0) * safeRenderScale;
  const scaledBlur =
    typeof item.blur === "number" && Number.isFinite(item.blur) && item.blur > 0
      ? item.blur * safeRenderScale
      : 0;
  const scaledX =
    (typeof item.x === "number" && Number.isFinite(item.x) ? item.x : 0) * safeRenderScale;
  const scaledY =
    (typeof item.y === "number" && Number.isFinite(item.y) ? item.y : 0) * safeRenderScale;

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
          opacity: item?.opacity !== undefined ? item.opacity / 100 : 1,
          zIndex: effectiveZIndex,
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
            <Img
              style={{
                pointerEvents: "none",
                top: -scaledCropY,
                left: -scaledCropX,
                width: scaledItemWidth ?? "100%",
                height: scaledItemHeight ?? "auto",
                position: "absolute",
                filter: scaledBlur > 0 ? `blur(${scaledBlur}px)` : "none",
              }}
            data-id={item.id}
            src={item.src || ""}
          />
        </div>
      </AbsoluteFill>
    </Sequence>
  );
};
