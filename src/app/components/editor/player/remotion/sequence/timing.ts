const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const secondsToFrames = (seconds: unknown, fps: number) => {
  const safeSeconds = isFiniteNumber(seconds) ? seconds : 0;
  const safeFps = isFiniteNumber(fps) && fps > 0 ? fps : 30;
  return Math.round(safeSeconds * safeFps);
};

export const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const calculateSequenceFrames = (
  display: { from: unknown; to: unknown },
  fps: number,
) => {
  const fromFrame = secondsToFrames(display.from, fps);
  const toFrame = secondsToFrames(display.to, fps);
  const durationInFrames = Math.max(1, toFrame - fromFrame);
  return { from: fromFrame, durationInFrames };
};

