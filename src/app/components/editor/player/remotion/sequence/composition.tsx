import { SequenceItem } from "./sequence-item";
import type { MediaFile, TextElement } from "@/app/types";
import { useVideoConfig } from "remotion";
import React from "react";

export type CompositionProps = {
  mediaFiles: MediaFile[];
  textElements: TextElement[];
  renderScale: number;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const Composition: React.FC<CompositionProps> = ({
  mediaFiles,
  textElements,
  renderScale,
}) => {
  const { fps } = useVideoConfig();
  const safeRenderScale =
    isFiniteNumber(renderScale) && renderScale > 0 ? renderScale : 1;
  return (
    <>
      {mediaFiles.map((item: MediaFile) => {
        if (!item) return null;
        const trackItem = {
          ...item,
        } as MediaFile;
        return (
          <React.Fragment key={trackItem.id}>
            {SequenceItem[trackItem.type](trackItem, {
              fps,
              renderScale: safeRenderScale,
            })}
          </React.Fragment>
        );
      })}
      {textElements.map((item: TextElement) => {
        if (!item) return null;
        const trackItem = {
          ...item,
        } as TextElement;
        return (
          <React.Fragment key={trackItem.id}>
            {SequenceItem["text"](trackItem, {
              fps,
              renderScale: safeRenderScale,
            })}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default Composition;
