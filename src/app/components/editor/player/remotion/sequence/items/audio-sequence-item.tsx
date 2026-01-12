import { MediaFile } from "@/app/types";
import { AbsoluteFill, Sequence } from "remotion";
import { Audio } from "@remotion/media";
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

export const AudioSequenceItem: React.FC<{
  item: MediaFile;
  options: SequenceItemOptions;
}> = ({ item, options }) => {
  const { fps } = options;
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
      style={{
        userSelect: "none",
        pointerEvents: "none",
      }}
    >
      <AbsoluteFill>
        <Audio
          trimBefore={trimBefore}
          trimAfter={trimAfter}
          playbackRate={playbackRate}
          src={src}
          volume={volume}
          fallbackHtml5AudioProps={{
            pauseWhenBuffering: true,
          }}
        />
      </AbsoluteFill>
    </Sequence>
  );
};
