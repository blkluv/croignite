"use client";

import { useAppSelector } from "@/app/store";
import {
  applyTimelineEdit,
  beginHistoryTransaction,
  endHistoryTransaction,
  setActiveElement,
  setActiveElementIndex,
  setMediaFiles,
} from "@/app/store/slices/projectSlice";
import { MediaFile, MediaType, TimelineTrack } from "@/app/types";
import Moveable, { OnDrag, OnResize } from "react-moveable";
import { throttle } from "lodash";
import { useDispatch } from "react-redux";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { Image as ImageIcon, Music, Video } from "lucide-react";
import {
  buildTimelineSnapEdges,
  computeRipplePlacement,
  findContainingClipAtTime,
  findNeighborLimits,
  findNearestSnapEdge,
  moveArrayItem,
  type TimelineClipBounds,
} from "@/app/components/editor/timeline/ops";

type Props = {
  trackId: string;
  mediaTypes: Array<Exclude<MediaType, "unknown">>;
  fallbackTrackIdForType: Record<MediaType, string | null>;
  fallbackTextTrackId: string | null;
  onDragHoverTrackId?: (trackId: string | null) => void;
  onSnapGuideTimeChange?: (timeSec: number | null) => void;
};

const SNAP_THRESHOLD_PX = 10;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const getSourceDurationSeconds = (clip: MediaFile) => {
  const source =
    isFiniteNumber(clip.sourceDurationSeconds) && clip.sourceDurationSeconds > 0
      ? clip.sourceDurationSeconds
      : null;
  if (source) return source;
  const fallback = isFiniteNumber(clip.endTime) && clip.endTime > 0 ? clip.endTime : null;
  return fallback;
};

export function MediaTimelineTrack({
  trackId,
  mediaTypes,
  fallbackTrackIdForType,
  fallbackTextTrackId,
  onDragHoverTrackId,
  onSnapGuideTimeChange,
}: Props) {
  const targetRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const moveableRef = useRef<Record<string, Moveable | null>>({});
  const [, forceUpdate] = useReducer((v) => v + 1, 0);
  const refCallbacks = useRef<
    Map<string, (el: HTMLDivElement | null) => void>
  >(new Map());
  const getTargetRef = useCallback(
    (id: string) => {
      const existing = refCallbacks.current.get(id);
      if (existing) return existing;
      const cb = (el: HTMLDivElement | null) => {
        const prev = targetRefs.current[id] ?? null;
        if (prev === el) return;
        if (el) {
          targetRefs.current[id] = el;
          forceUpdate();
          return;
        }
        delete targetRefs.current[id];
      };
      refCallbacks.current.set(id, cb);
      return cb;
    },
    [forceUpdate],
  );
  const lastHoverTrackIdRef = useRef<string | null>(null);
  const lastSnapGuideTimeRef = useRef<number | null>(null);
  const { mediaFiles, textElements, tracks, activeElement, activeElementIndex, timelineZoom } =
    useAppSelector((state) => state.projectState);
  const dispatch = useDispatch();
  const zoom =
    isFiniteNumber(timelineZoom) && timelineZoom > 0 ? timelineZoom : 60;

  const mediaFilesRef = useRef(mediaFiles);
  useEffect(() => {
    mediaFilesRef.current = mediaFiles;
  }, [mediaFiles]);

  const textElementsRef = useRef(textElements);
  useEffect(() => {
    textElementsRef.current = textElements;
  }, [textElements]);

  const onUpdateMedia = useMemo(
    () =>
      throttle((id: string, updates: Partial<MediaFile>) => {
        const currentFiles = mediaFilesRef.current;
        const updated = currentFiles.map((media) =>
          media.id === id ? { ...media, ...updates } : media,
        );
        dispatch(setMediaFiles(updated));
      }, 100),
    [dispatch],
  );

  const handleClick = (id: string) => {
    dispatch(setActiveElement("media"));
    const actualIndex = mediaFiles.findIndex((clip) => clip.id === id);
    dispatch(setActiveElementIndex(actualIndex));
  };

  const handleDrag = (
    clip: MediaFile,
    target: HTMLElement,
    left: number,
    top?: number,
  ) => {
    const constrainedLeft = Math.max(left, 0);
    const newPositionStart = constrainedLeft / zoom;
    const duration = Math.max(0, clip.positionEnd - clip.positionStart);
    onUpdateMedia(clip.id, {
      positionStart: newPositionStart,
      positionEnd: newPositionStart + duration,
    });

    target.style.left = `${constrainedLeft}px`;
    if (isFiniteNumber(top)) {
      target.style.top = `${top}px`;
    }
  };

  const findTrackIdAtPoint = (clientX: number, clientY: number) => {
    const elements = document.elementsFromPoint(
      clientX,
      clientY,
    ) as HTMLElement[];
    const trackEl = elements.find(
      (el) => el?.dataset?.timelineTrackId !== undefined,
    );
    return trackEl?.dataset?.timelineTrackId ?? null;
  };

  const reportHoverTrackId = (next: string | null) => {
    if (!onDragHoverTrackId) return;
    if (lastHoverTrackIdRef.current === next) return;
    lastHoverTrackIdRef.current = next;
    onDragHoverTrackId(next);
  };

  const reportSnapGuideTime = (timeSec: number | null) => {
    if (!onSnapGuideTimeChange) return;
    const normalized =
      typeof timeSec === "number" && Number.isFinite(timeSec)
        ? Math.round(timeSec * 1000) / 1000
        : null;
    if (lastSnapGuideTimeRef.current === normalized) return;
    lastSnapGuideTimeRef.current = normalized;
    onSnapGuideTimeChange(normalized);
  };

  const getTrackBounds = (targetTrackId: string) => {
    const bounds = [
      ...mediaFilesRef.current
        .filter(
          (clip) =>
            (clip.trackId ?? fallbackTrackIdForType[clip.type]) === targetTrackId,
        )
        .map((clip) => ({
          id: clip.id,
          start: clip.positionStart,
          end: clip.positionEnd,
        })),
      ...textElementsRef.current
        .filter(
          (clip) =>
            (clip.trackId ?? fallbackTextTrackId) === targetTrackId,
        )
        .map((clip) => ({
          id: clip.id,
          start: clip.positionStart,
          end: clip.positionEnd,
        })),
    ];
    return bounds;
  };

  const getAllTimelineBounds = (): TimelineClipBounds[] => {
    const bounds: TimelineClipBounds[] = [
      ...mediaFilesRef.current.map((clip) => ({
        id: clip.id,
        start: clip.positionStart,
        end: clip.positionEnd,
      })),
      ...textElementsRef.current.map((clip) => ({
        id: clip.id,
        start: clip.positionStart,
        end: clip.positionEnd,
      })),
    ];
    return bounds;
  };

 	  const handleRightResize = (
	    clip: MediaFile,
	    target: HTMLElement,
	    width: number,
	  ) => {
    const currentTrackId =
      clip.trackId ?? fallbackTrackIdForType[clip.type] ?? trackId;
    const bounds = getTrackBounds(currentTrackId);
    const { maxEnd } = findNeighborLimits({
      clips: bounds,
      movingId: clip.id,
      desiredStart: clip.positionEnd,
    });

	    const playbackSpeed =
	      isFiniteNumber(clip.playbackSpeed) && clip.playbackSpeed > 0
	        ? clip.playbackSpeed
	        : 1;

	    const sourceDurationSeconds =
	      clip.type === "video" || clip.type === "audio"
	        ? getSourceDurationSeconds(clip)
	        : null;
	    const maxEndBySource =
	      clip.type === "video" || clip.type === "audio"
	        ? (() => {
	            if (!sourceDurationSeconds) return clip.positionEnd;
	            const startTime =
	              isFiniteNumber(clip.startTime) && clip.startTime >= 0 ? clip.startTime : 0;
	            const availableSeconds = Math.max(0, sourceDurationSeconds - startTime);
	            const maxDurationOnTimeline = availableSeconds / playbackSpeed;
	            return clip.positionStart + maxDurationOnTimeline;
	          })()
	        : Number.POSITIVE_INFINITY;

	    const desiredDuration = Math.max(0, width / zoom);
	    const unclampedEnd = clip.positionStart + desiredDuration;
	    const clampedEnd = Math.min(unclampedEnd, maxEnd, maxEndBySource);
	    const nextDuration = Math.max(0, clampedEnd - clip.positionStart);

	    const updates: Partial<MediaFile> = {
	      positionEnd: clampedEnd,
	    };

	    if (clip.type === "video" || clip.type === "audio") {
	      const startTime =
	        isFiniteNumber(clip.startTime) && clip.startTime >= 0 ? clip.startTime : 0;
	      const nextEndTime = startTime + nextDuration * playbackSpeed;
	      updates.endTime = sourceDurationSeconds
	        ? Math.min(nextEndTime, sourceDurationSeconds)
	        : nextEndTime;
	    }

	    onUpdateMedia(clip.id, updates);
	    target.style.width = `${Math.max(2, nextDuration * zoom)}px`;
	  };

	  const handleLeftResize = (
	    clip: MediaFile,
	    target: HTMLElement,
	    width: number,
	  ) => {
    const currentTrackId =
      clip.trackId ?? fallbackTrackIdForType[clip.type] ?? trackId;
    const bounds = getTrackBounds(currentTrackId);
    const { minStart } = findNeighborLimits({
      clips: bounds,
      movingId: clip.id,
      desiredStart: clip.positionStart,
    });

	    const playbackSpeed =
	      isFiniteNumber(clip.playbackSpeed) && clip.playbackSpeed > 0
	        ? clip.playbackSpeed
	        : 1;

	    const sourceDurationSeconds =
	      clip.type === "video" || clip.type === "audio"
	        ? getSourceDurationSeconds(clip)
	        : null;
	    const clipEndTime =
	      clip.type === "video" || clip.type === "audio"
	        ? (() => {
	            const endTime = isFiniteNumber(clip.endTime) ? Math.max(0, clip.endTime) : 0;
	            return sourceDurationSeconds ? Math.min(endTime, sourceDurationSeconds) : endTime;
	          })()
	        : 0;

	    const minStartBySource =
	      clip.type === "video" || clip.type === "audio"
	        ? clip.positionEnd - clipEndTime / playbackSpeed
	        : 0;

	    const desiredDuration = Math.max(0, width / zoom);
	    const unclampedStart = Math.max(0, clip.positionEnd - desiredDuration);
	    const clampedStart = Math.max(unclampedStart, minStart, minStartBySource);
	    const nextDuration = Math.max(0, clip.positionEnd - clampedStart);

	    const updates: Partial<MediaFile> = {
	      positionStart: clampedStart,
	    };

	    if (clip.type === "video" || clip.type === "audio") {
	      updates.startTime = Math.max(0, clipEndTime - nextDuration * playbackSpeed);
	    }

	    onUpdateMedia(clip.id, updates);
	    target.style.left = `${clampedStart * zoom}px`;
	    target.style.width = `${Math.max(2, nextDuration * zoom)}px`;
	  };

  useEffect(() => {
    for (const clip of mediaFiles) {
      moveableRef.current[clip.id]?.updateRect();
    }
  }, [timelineZoom, mediaFiles]);

  const getClipIcon = (type: MediaType) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" aria-hidden="true" />;
      case "audio":
        return <Music className="h-4 w-4" aria-hidden="true" />;
      case "image":
        return <ImageIcon className="h-4 w-4" aria-hidden="true" />;
      default:
        return null;
    }
  };

  return (
    <div>
      {mediaFiles
        .filter(
          (clip) =>
            mediaTypes.includes(clip.type as Exclude<MediaType, "unknown">) &&
            (clip.trackId ?? fallbackTrackIdForType[clip.type]) === trackId,
        )
        .map((clip) => (
          <div key={clip.id}>
            {(() => {
              const positionStart = isFiniteNumber(clip.positionStart)
                ? clip.positionStart
                : 0;
              const positionEnd = isFiniteNumber(clip.positionEnd)
                ? clip.positionEnd
                : positionStart;
              const widthPx = Math.max(
                2,
                (positionEnd - positionStart) * zoom,
              );
              const leftPx = Math.max(0, positionStart * zoom);

	              return (
	                <div
	                  data-timeline-clip="true"
	                  ref={getTargetRef(clip.id)}
	                  onClick={() => handleClick(clip.id)}
	                  className={`absolute top-2 flex h-12 cursor-pointer items-center gap-2 rounded-md border px-2 text-sm text-white/90 shadow-sm ${
	                    clip.type === "video"
                      ? "border-indigo-400/40 bg-indigo-500/15"
                      : clip.type === "image"
                        ? "border-sky-400/40 bg-sky-500/15"
                        : clip.type === "audio"
                          ? "border-[color:var(--brand-success)] bg-[color:var(--brand-success-soft)]"
                          : "border-white/10 bg-white/5"
                  } ${
                    activeElement === "media" &&
                    mediaFiles[activeElementIndex]?.id === clip.id
                      ? "ring-2 ring-blue-500/70"
                      : "hover:bg-white/10"
                  }`}
                  style={{
                    left: `${leftPx}px`,
                    width: `${widthPx}px`,
                    zIndex: clip.zIndex,
                  }}
                >
                  <span className="inline-flex h-7 w-7 min-w-6 items-center justify-center text-white/80">
                    {getClipIcon(clip.type)}
                  </span>
                  <span className="truncate text-x">{clip.fileName}</span>
                </div>
              );
            })()}

            {targetRefs.current[clip.id] ? (
              <Moveable
                ref={(el: Moveable | null) => {
                  if (el) {
                    moveableRef.current[clip.id] = el;
                  }
                }}
                target={targetRefs.current[clip.id] ?? null}
                container={null}
                renderDirections={
                  activeElement === "media" &&
                  mediaFiles[activeElementIndex]?.id === clip.id
                    ? ["w", "e"]
                    : []
                }
                draggable
                throttleDrag={0}
                rotatable={false}
                resizable
                throttleResize={0}
                linePadding={4}
                controlPadding={6}
                onDragStart={() => {
                  dispatch(beginHistoryTransaction());
                  reportSnapGuideTime(null);
                }}
                onDrag={({ target, left, top, clientX, clientY }: OnDrag) => {
                  handleClick(clip.id);
                  const hoverTrackId = findTrackIdAtPoint(clientX, clientY);
                  reportHoverTrackId(hoverTrackId);

                  const currentTrackId =
                    clip.trackId ?? fallbackTrackIdForType[clip.type] ?? trackId;
                  const targetTrackId =
                    hoverTrackId && !hoverTrackId.startsWith("__new-layer")
                      ? hoverTrackId
                      : currentTrackId;

                  const constrainedLeft = Math.max(left, 0);
                  const candidateStart = constrainedLeft / zoom;

                  const bounds = getTrackBounds(targetTrackId);
                  const overlapHit = findContainingClipAtTime({
                    clips: bounds,
                    time: candidateStart,
                    ignoreId: clip.id,
                  });

                  const snapThresholdSeconds = SNAP_THRESHOLD_PX / zoom;
                  const allEdges = buildTimelineSnapEdges(getAllTimelineBounds());
                  const nearestEdge =
                    !overlapHit && snapThresholdSeconds > 0
                      ? findNearestSnapEdge({
                          edges: allEdges,
                          time: candidateStart,
                          threshold: snapThresholdSeconds,
                          ignoreClipId: clip.id,
                        })
                      : null;

                  const snappedStart = overlapHit
                    ? overlapHit.end
                    : nearestEdge
                      ? nearestEdge.time
                      : candidateStart;

                  reportSnapGuideTime(overlapHit ? overlapHit.end : nearestEdge?.time ?? null);
                  handleDrag(
                    clip,
                    target as HTMLElement,
                    snappedStart * zoom,
                    top,
                  );
                }}
                onDragEnd={({ target, clientX, clientY }) => {
                  reportSnapGuideTime(null);
                  reportHoverTrackId(null);
                  try {
                    if (!target) return;
                    onUpdateMedia.cancel();
                    (target as HTMLElement).style.top = "";
                    if (!isFiniteNumber(clientX) || !isFiniteNumber(clientY)) return;

                    const dropTarget = findTrackIdAtPoint(clientX, clientY);
                    const current = mediaFilesRef.current.find((m) => m.id === clip.id);
                    if (!current) return;

                    const currentTrackId =
                      current.trackId ??
                      fallbackTrackIdForType[current.type] ??
                      trackId;

                    let targetTrackId = dropTarget ?? currentTrackId;
                    let nextTracks: TimelineTrack[] | undefined;

                    if (
                      dropTarget === "__new-layer-top" ||
                      dropTarget === "__new-layer-bottom"
                    ) {
                      const insertAt =
                        dropTarget === "__new-layer-bottom"
                          ? Math.min(2, tracks.length)
                          : tracks.length;

                      const originIndex = tracks.findIndex(
                        (t) => t.id === currentTrackId,
                      );
                      const originHasOtherItems =
                        mediaFilesRef.current.some(
                          (m) =>
                            m.id !== current.id &&
                            (m.trackId ?? fallbackTrackIdForType[m.type]) ===
                              currentTrackId,
                        ) ||
                        textElementsRef.current.some(
                          (t) => (t.trackId ?? fallbackTextTrackId) === currentTrackId,
                        );

                      const reuseOriginTrack = originIndex >= 2 && !originHasOtherItems;

                      if (reuseOriginTrack) {
                        const desiredIndex =
                          dropTarget === "__new-layer-top"
                            ? tracks.length - 1
                            : insertAt;
                        if (originIndex !== desiredIndex) {
                          nextTracks = moveArrayItem(tracks, originIndex, insertAt);
                        }
                        targetTrackId = currentTrackId;
                      } else {
                        const nextId = crypto.randomUUID();
                        const newTrack: TimelineTrack = {
                          id: nextId,
                          kind: "layer",
                          name: `Layer ${insertAt + 1}`,
                        };
                        nextTracks = [
                          ...tracks.slice(0, insertAt),
                          newTrack,
                          ...tracks.slice(insertAt),
                        ];
                        targetTrackId = nextId;
                      }
                    }

                    if (!targetTrackId) return;

                    const rawLeft = Number.parseFloat(
                      (target as HTMLElement).style.left || "0",
                    );
                    const leftPx = Number.isFinite(rawLeft)
                      ? Math.max(0, rawLeft)
                      : 0;
                    const desiredStart = leftPx / zoom;

                    const duration = Math.max(
                      0,
                      current.positionEnd - current.positionStart,
                    );

                    const bounds = getTrackBounds(targetTrackId);
                    const placement = computeRipplePlacement({
                      clips: bounds,
                      movingId: current.id,
                      desiredStart,
                      duration,
                    });

                    const nextMediaFiles = mediaFilesRef.current.map((m) => {
                      if (m.id === current.id) {
                        return {
                          ...m,
                          trackId: targetTrackId,
                          positionStart: placement.start,
                          positionEnd: placement.end,
                        };
                      }

                      const delta = placement.shifts[m.id];
                      if (
                        typeof delta !== "number" ||
                        !Number.isFinite(delta) ||
                        delta === 0
                      ) {
                        return m;
                      }

                      return {
                        ...m,
                        positionStart: m.positionStart + delta,
                        positionEnd: m.positionEnd + delta,
                      };
                    });

                    const nextTextElements = textElementsRef.current.map((t) => {
                      const delta = placement.shifts[t.id];
                      if (
                        typeof delta !== "number" ||
                        !Number.isFinite(delta) ||
                        delta === 0
                      ) {
                        return t;
                      }
                      return {
                        ...t,
                        positionStart: t.positionStart + delta,
                        positionEnd: t.positionEnd + delta,
                      };
                    });

                    dispatch(
                      applyTimelineEdit({
                        ...(nextTracks ? { tracks: nextTracks } : {}),
                        mediaFiles: nextMediaFiles,
                        textElements: nextTextElements,
                      }),
                    );
                  } finally {
                    dispatch(endHistoryTransaction());
                  }
                }}
                onResizeStart={() => {
                  dispatch(beginHistoryTransaction());
                }}
                onResize={({ target, width, delta, direction }: OnResize) => {
                  if (!isFiniteNumber(width) || !target) return;
                  if (direction[0] === 1) {
                    handleClick(clip.id);
                    if (delta[0]) target.style.width = `${width}px`;
                    handleRightResize(clip, target as HTMLElement, width);
                  } else if (direction[0] === -1) {
                    handleClick(clip.id);
                    if (delta[0]) target.style.width = `${width}px`;
                    handleLeftResize(clip, target as HTMLElement, width);
                  }
                }}
                onResizeEnd={() => {
                  onUpdateMedia.flush();
                  dispatch(endHistoryTransaction());
                }}
                className={
                  activeElement === "media" &&
                  mediaFiles[activeElementIndex]?.id === clip.id
                    ? "moveable-timeline"
                    : "moveable-control-box-hidden"
                }
              />
            ) : null}
          </div>
        ))}
    </div>
  );
}

export default React.memo(MediaTimelineTrack);
