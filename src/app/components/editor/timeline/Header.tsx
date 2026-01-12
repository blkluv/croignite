import React, { useMemo } from "react";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

type HeaderProps = {
  labelWidth: number;
  totalSeconds: number;
  zoom: number;
  onLabelClick?: () => void;
};

export const Header = ({ labelWidth, totalSeconds, zoom, onLabelClick }: HeaderProps) => {
  const secondInterval = 0.2; // Every 0.2s
  const safeTotalSeconds =
    isFiniteNumber(totalSeconds) && totalSeconds > 0
      ? totalSeconds
      : 61;
  const safeZoom = isFiniteNumber(zoom) && zoom > 0 ? zoom : 60;
  const laneWidthPx = safeTotalSeconds * safeZoom;

  const tickMarkers = useMemo(() => {
    const ticksPerSecond = Math.round(1 / secondInterval);
    const totalTicks = Math.ceil(safeTotalSeconds * ticksPerSecond);
    return Array.from({ length: totalTicks + 1 }, (_, i) => ({
      index: i,
      seconds: i / ticksPerSecond,
      isWholeSecond: i % ticksPerSecond === 0 && i !== 0,
    }));
  }, [safeTotalSeconds]);

  return (
    <div
      className="flex h-12 items-end border-b border-white/10 bg-[#1E1D21]"
      style={{ width: `${labelWidth + laneWidthPx}px` }}
    >
      <div
        className="sticky left-0 z-30 flex h-full items-center border-r border-white/10 bg-[#1E1D21] px-3"
        style={{ width: `${labelWidth}px` }}
        onClick={(e) => {
          e.stopPropagation();
          onLabelClick?.();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onLabelClick?.();
        }}
      >
        <span className="text-xs font-medium text-white/60">Layers</span>
      </div>

      <div className="relative h-full" style={{ width: `${laneWidthPx}px` }}>
        {tickMarkers.map((marker) => {
          return (
            <div
              key={marker.index}
              className="absolute bottom-0 flex flex-col items-center"
              style={{
                left: `${marker.seconds * safeZoom}px`,
                width: `1px`,
                height: "100%",
              }}
            >
              <div
                className={`w-px ${
                  marker.isWholeSecond
                    ? "h-8 bg-white/35"
                    : "h-3 bg-white/20"
                }`}
              />

              {marker.isWholeSecond && (
                <span className="mt-1 select-none text-[10px] text-white/50">
                  {marker.seconds}s
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Header;
