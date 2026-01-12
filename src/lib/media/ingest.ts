"use client";

import type { MediaFile, MediaType } from "@/app/types";
import { categorizeFile } from "@/app/utils/utils";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

type FrameSize = { width: number; height: number };

type MediaMetadata = {
  width?: number;
  height?: number;
  durationSeconds?: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const fitWithinFrame = (options: {
  sourceWidth: number;
  sourceHeight: number;
  frame: FrameSize;
  maxFill?: number;
}) => {
  const { sourceWidth, sourceHeight, frame, maxFill = 0.9 } = options;
  const safeSourceWidth = isFiniteNumber(sourceWidth) && sourceWidth > 0 ? sourceWidth : 1;
  const safeSourceHeight = isFiniteNumber(sourceHeight) && sourceHeight > 0 ? sourceHeight : 1;
  const safeFrameWidth = isFiniteNumber(frame.width) && frame.width > 0 ? frame.width : 1920;
  const safeFrameHeight = isFiniteNumber(frame.height) && frame.height > 0 ? frame.height : 1080;

  const maxWidth = safeFrameWidth * maxFill;
  const maxHeight = safeFrameHeight * maxFill;
  const scale = Math.min(1, maxWidth / safeSourceWidth, maxHeight / safeSourceHeight);

  const width = Math.round(safeSourceWidth * scale);
  const height = Math.round(safeSourceHeight * scale);

  return {
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
};

const getImageMetadata = (src: string): Promise<MediaMetadata> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    img.onerror = () => reject(new Error("Failed to load image metadata"));
    img.src = src;
  });

const getVideoMetadata = (src: string): Promise<MediaMetadata> =>
  new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      const durationSeconds = isFiniteNumber(video.duration) ? video.duration : undefined;
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        durationSeconds,
      });
      cleanup();
    };
    video.onerror = () => {
      reject(new Error("Failed to load video metadata"));
      cleanup();
    };
    video.src = src;
  });

const getAudioMetadata = (src: string): Promise<MediaMetadata> =>
  new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";

    const cleanup = () => {
      audio.removeAttribute("src");
      audio.load();
    };

    audio.onloadedmetadata = () => {
      const durationSeconds = isFiniteNumber(audio.duration) ? audio.duration : undefined;
      resolve({ durationSeconds });
      cleanup();
    };
    audio.onerror = () => {
      reject(new Error("Failed to load audio metadata"));
      cleanup();
    };
    audio.src = src;
  });

const getMediaMetadata = async (options: {
  type: MediaType;
  src: string;
}): Promise<MediaMetadata> => {
  const { type, src } = options;
  if (!src) return {};

  try {
    if (type === "image") return await getImageMetadata(src);
    if (type === "video") return await getVideoMetadata(src);
    if (type === "audio") return await getAudioMetadata(src);
    return {};
  } catch {
    return {};
  }
};

export async function createMediaFileFromFile(options: {
  file: File;
  fileId: string;
  src: string;
  positionStart: number;
  frame: FrameSize;
  includeInMerge?: boolean;
  zIndex?: number;
  trackId?: string;
  defaultDurationSeconds?: number;
}): Promise<MediaFile> {
  const {
    file,
    fileId,
    src,
    positionStart,
    frame,
    includeInMerge = true,
    zIndex = 0,
    trackId,
    defaultDurationSeconds = 30,
  } = options;

  const type = categorizeFile(file.type);
  const metadata = await getMediaMetadata({ type, src });

  const durationSeconds = (() => {
    if (type === "image") return defaultDurationSeconds;
    if (isFiniteNumber(metadata.durationSeconds) && metadata.durationSeconds > 0) {
      return metadata.durationSeconds;
    }
    return defaultDurationSeconds;
  })();

  const sourceDurationSeconds =
    type === "video" || type === "audio" ? durationSeconds : undefined;

  const safePositionStart =
    isFiniteNumber(positionStart) && positionStart >= 0 ? positionStart : 0;
  const positionEnd = safePositionStart + durationSeconds;

  const visualSize =
    type === "image" || type === "video"
      ? fitWithinFrame({
          sourceWidth: metadata.width ?? frame.width,
          sourceHeight: metadata.height ?? frame.height,
          frame,
          maxFill: 0.9,
        })
      : null;

  const x =
    visualSize && isFiniteNumber(frame.width)
      ? Math.round((frame.width - visualSize.width) / 2)
      : 0;
  const y =
    visualSize && isFiniteNumber(frame.height)
      ? Math.round((frame.height - visualSize.height) / 2)
      : 0;

  const width = visualSize?.width;
  const height = visualSize?.height;

  const crop =
    type === "image" || type === "video"
      ? {
          x: 0,
          y: 0,
          width: width ?? frame.width,
          height: height ?? frame.height,
        }
      : undefined;

  return {
    id: crypto.randomUUID(),
    fileName: file.name,
    fileId,
    startTime: 0,
    endTime: clamp(durationSeconds, 0, durationSeconds),
    sourceDurationSeconds,
    src,
    positionStart: safePositionStart,
    positionEnd,
    includeInMerge,
    trackId,
    x: type === "image" || type === "video" ? Math.max(0, x) : undefined,
    y: type === "image" || type === "video" ? Math.max(0, y) : undefined,
    width,
    height,
    rotation: 0,
    opacity: 100,
    crop,
    playbackSpeed: 1,
    volume: 100,
    type,
    zIndex,
  };
}
