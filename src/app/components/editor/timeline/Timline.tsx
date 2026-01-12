import { getFile, useAppSelector } from "@/app/store";
import type { MediaType } from "@/app/types";
import {
  addMarker,
  applyTimelineEdit,
  deleteMarker,
  setActiveElement,
  setActiveElementIndex,
  setCurrentTime,
  setIsPlaying,
  setMarkerTrack,
  setMediaFiles,
  setTextElements,
  setTimelineZoom,
  updateMarker,
  beginHistoryTransaction,
  endHistoryTransaction,
} from "@/app/store/slices/projectSlice";
import { throttle } from "lodash";
import {
  Copy,
  Flag,
  Info,
  Layers,
  LocateFixed,
  LocateOff,
  Scissors,
  Trash2,
} from "lucide-react";
import {
  memo,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { useEditorPlayer } from "@/app/components/editor/player/remotion/EditorPlayerContext";
import { useCurrentPlayerFrame } from "@/app/components/editor/player/remotion/useCurrentPlayerFrame";
import GlobalKeyHandlerProps from "../../../components/editor/keys/GlobalKeyHandlerProps";
import Header from "./Header";
import { TimelineToolButton } from "./TimelineToolButton";
import MediaTimelineTrack from "./elements-timeline/MediaTimelineTrack";
import TextTimeline from "./elements-timeline/TextTimeline";
import { computeRipplePlacement } from "./ops";
import { categorizeFile } from "@/app/utils/utils";
import { createMediaFileFromFile } from "@/lib/media/ingest";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TRACK_LABEL_WIDTH_PX = 144;
const LIBRARY_ASSET_MIME = "application/x-cliplore-library-asset";
const TIMELINE_ZOOM_MIN = 30;
const TIMELINE_ZOOM_MAX = 150;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const Timeline = () => {
  const {
    timelineZoom,
    enableMarkerTracking,
    activeElement,
    activeElementIndex,
    mediaFiles,
    textElements,
    duration,
    isPlaying,
    currentTime,
    tracks,
    markers,
    fps,
    resolution,
  } = useAppSelector((state) => state.projectState);
  const dispatch = useDispatch();
  const { player } = useEditorPlayer();
  const safeFps =
    typeof fps === "number" && Number.isFinite(fps) && fps > 0 ? fps : 30;
  const playerFrame = useCurrentPlayerFrame(player);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDraggingMarker, setIsDraggingMarker] = useState(false);
  const [draggingTimelineMarkerId, setDraggingTimelineMarkerId] = useState<
    string | null
  >(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [layerInsertPreview, setLayerInsertPreview] = useState<
    "top" | "bottom" | null
  >(null);
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
  const [timelineHelpOpen, setTimelineHelpOpen] = useState(false);
  const [snapGuideTime, setSnapGuideTime] = useState<number | null>(null);

  const zoom = isFiniteNumber(timelineZoom) && timelineZoom > 0 ? timelineZoom : 60;
  const safeDuration = isFiniteNumber(duration) && duration > 0 ? duration : 0;
  const safeCurrentTime =
    isFiniteNumber(currentTime) && currentTime >= 0
      ? Math.max(0, Math.min(safeDuration, currentTime))
      : 0;
  const playheadTime = !player || !isPlaying ? safeCurrentTime : playerFrame / safeFps;

  const markerSnapSeconds = Math.max(0.04, 1 / safeFps);
  const markerAtPlayhead = useMemo(() => {
    const t = playheadTime;
    let nearest: (typeof markers)[number] | null = null;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (const marker of markers) {
      const dist = Math.abs(marker.time - t);
      if (dist <= markerSnapSeconds && dist < nearestDist) {
        nearest = marker;
        nearestDist = dist;
      }
    }
    return nearest;
  }, [markerSnapSeconds, markers, playheadTime]);

  const maxMarkerTime =
    markers.length > 0 ? Math.max(...markers.map((m) => m.time)) : 0;
  const totalSeconds = Math.max(safeDuration + 2, maxMarkerTime + 2, 61);
  const laneWidthPx = totalSeconds * zoom;
  const timelineCanvasWidthPx = TRACK_LABEL_WIDTH_PX + laneWidthPx;

  const baseTrackId = tracks[0]?.id ?? null;
  const overlayTrackId = tracks[1]?.id ?? baseTrackId;
  const audioTrackId = tracks[2]?.id ?? baseTrackId;

  const fallbackTrackIdForType = useMemo<Record<MediaType, string | null>>(
    () => ({
      video: baseTrackId,
      image: overlayTrackId ?? baseTrackId,
      audio: audioTrackId ?? baseTrackId,
      unknown: baseTrackId,
    }),
    [audioTrackId, baseTrackId, overlayTrackId],
  );

  const fallbackTextTrackId = overlayTrackId ?? baseTrackId;

  const displayTracks = useMemo(() => [...tracks].reverse(), [tracks]);

  const handleDragHoverTrackId = useCallback((trackId: string | null) => {
    setHoveredTrackId(trackId);
    const next =
      trackId === "__new-layer-top"
        ? "top"
        : trackId === "__new-layer-bottom"
          ? "bottom"
          : null;
    setLayerInsertPreview((prev) => (prev === next ? prev : next));
  }, []);

  const handleSnapGuideTimeChange = useCallback((time: number | null) => {
    setSnapGuideTime((prev) => (prev === time ? prev : time));
  }, []);

  const getTrackBounds = useCallback(
    (targetTrackId: string) => {
      const bounds = [
        ...mediaFiles
          .filter(
            (clip) =>
              (clip.trackId ?? fallbackTrackIdForType[clip.type]) === targetTrackId,
          )
          .map((clip) => ({
            id: clip.id,
            start: clip.positionStart,
            end: clip.positionEnd,
          })),
        ...textElements
          .filter(
            (clip) => (clip.trackId ?? fallbackTextTrackId) === targetTrackId,
          )
          .map((clip) => ({
            id: clip.id,
            start: clip.positionStart,
            end: clip.positionEnd,
          })),
      ];
      return bounds;
    },
    [fallbackTextTrackId, fallbackTrackIdForType, mediaFiles, textElements],
  );

  const throttledZoom = useMemo(
    () =>
      throttle((value: number) => {
        dispatch(setTimelineZoom(value));
      }, 100),
    [dispatch],
  );

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.altKey) {
        event.preventDefault();

        const rect = el.getBoundingClientRect();
        const scrollOffset = el.scrollLeft;
        const offsetX =
          event.clientX - rect.left + scrollOffset - TRACK_LABEL_WIDTH_PX;
        const secondsAtCursor = Math.max(0, offsetX) / zoom;

        const normalized = Math.min(
          2,
          Math.max(0.3, Math.abs(event.deltaY) / 120),
        );
        const baseFactor = 1.12;
        const factor = event.deltaY < 0 ? baseFactor : 1 / baseFactor;
        const nextZoom = Math.max(
          TIMELINE_ZOOM_MIN,
          Math.min(
            TIMELINE_ZOOM_MAX,
            Math.round(zoom * Math.pow(factor, normalized)),
          ),
        );

        if (nextZoom === zoom) return;

        dispatch(setTimelineZoom(nextZoom));

        const nextOffsetX = secondsAtCursor * nextZoom;
        const nextScrollLeft =
          nextOffsetX - (event.clientX - rect.left) + TRACK_LABEL_WIDTH_PX;
        el.scrollLeft = Math.max(0, nextScrollLeft);
        return;
      }

      if (event.shiftKey) {
        event.preventDefault();
        const delta =
          Math.abs(event.deltaX) > Math.abs(event.deltaY)
            ? event.deltaX
            : event.deltaY;
        el.scrollLeft = Math.max(0, el.scrollLeft + delta);
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [dispatch, zoom]);

  const getUnboundedTimeFromClientX = useCallback(
    (clientX: number) => {
      if (!timelineRef.current) return 0;
      const rect = timelineRef.current.getBoundingClientRect();
      const scrollOffset = timelineRef.current.scrollLeft;
      const offsetX = clientX - rect.left + scrollOffset - TRACK_LABEL_WIDTH_PX;
      const seconds = Math.max(0, offsetX) / zoom;
      return Math.max(0, seconds);
    },
    [zoom],
  );

  const findTrackIdAtPoint = useCallback((clientX: number, clientY: number) => {
    const elements = document.elementsFromPoint(clientX, clientY) as HTMLElement[];
    const trackEl = elements.find((el) => el?.dataset?.timelineTrackId !== undefined);
    return trackEl?.dataset?.timelineTrackId ?? null;
  }, []);

  const isLibraryAssetDrag = useCallback(
    (dataTransfer: DataTransfer) =>
      dataTransfer.types.includes(LIBRARY_ASSET_MIME) ||
      (dataTransfer.types.includes("text/plain") &&
        !dataTransfer.types.includes("Files")),
    [],
  );

  const readLibraryAssetPayload = useCallback((dataTransfer: DataTransfer) => {
    const raw =
      dataTransfer.getData(LIBRARY_ASSET_MIME) || dataTransfer.getData("text/plain");
    const parsed = (() => {
      try {
        return JSON.parse(raw) as { fileId?: string };
      } catch {
        return null;
      }
    })();
    return typeof parsed?.fileId === "string" ? parsed.fileId : null;
  }, []);

  const handleLibraryDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      if (!isLibraryAssetDrag(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      handleDragHoverTrackId(null);

      const fileId = readLibraryAssetPayload(e.dataTransfer);
      if (!fileId) return;

      const file = await getFile(fileId);
      if (!file) {
        toast.error("File not found.");
        return;
      }

      const type = categorizeFile(file.type);
      const dropTarget = findTrackIdAtPoint(e.clientX, e.clientY);

      let targetTrackId =
        typeof dropTarget === "string" ? dropTarget : fallbackTrackIdForType[type];
      let nextTracks: typeof tracks | undefined;

      if (dropTarget === "__new-layer-top" || dropTarget === "__new-layer-bottom") {
        const insertAt =
          dropTarget === "__new-layer-bottom"
            ? Math.min(2, tracks.length)
            : tracks.length;
        const nextId = crypto.randomUUID();
        nextTracks = [
          ...tracks.slice(0, insertAt),
          {
            id: nextId,
            kind: "layer",
            name: `Layer ${insertAt + 1}`,
          },
          ...tracks.slice(insertAt),
        ];
        targetTrackId = nextId;
      }

      if (!targetTrackId || targetTrackId.startsWith("__new-layer")) {
        toast.error("Drop on a layer to place this clip.");
        return;
      }

      const desiredStart = getUnboundedTimeFromClientX(e.clientX);
      const src = URL.createObjectURL(file);
      const defaultDurationSeconds = type === "image" ? 5 : 30;
      const nextClip = await createMediaFileFromFile({
        file,
        fileId,
        src,
        positionStart: desiredStart,
        frame: {
          width: resolution?.width ?? 1920,
          height: resolution?.height ?? 1080,
        },
        trackId: targetTrackId,
        defaultDurationSeconds,
      });

      const clipDuration = Math.max(
        0,
        nextClip.positionEnd - nextClip.positionStart,
      );
      const placement = computeRipplePlacement({
        clips: getTrackBounds(targetTrackId),
        movingId: nextClip.id,
        desiredStart,
        duration: clipDuration,
      });

      const shiftedMediaFiles = mediaFiles.map((clip) => {
        const delta = placement.shifts[clip.id];
        if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) {
          return clip;
        }
        return {
          ...clip,
          positionStart: clip.positionStart + delta,
          positionEnd: clip.positionEnd + delta,
        };
      });

      const shiftedTextElements = textElements.map((clip) => {
        const delta = placement.shifts[clip.id];
        if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) {
          return clip;
        }
        return {
          ...clip,
          positionStart: clip.positionStart + delta,
          positionEnd: clip.positionEnd + delta,
        };
      });

      const placedClip = {
        ...nextClip,
        positionStart: placement.start,
        positionEnd: placement.end,
      };

      const nextMediaFiles = [...shiftedMediaFiles, placedClip];

      dispatch(
        applyTimelineEdit({
          ...(nextTracks ? { tracks: nextTracks } : {}),
          mediaFiles: nextMediaFiles,
          textElements: shiftedTextElements,
        }),
      );

      dispatch(setActiveElement("media"));
      const newIndex = nextMediaFiles.findIndex((m) => m.id === placedClip.id);
      if (newIndex >= 0) dispatch(setActiveElementIndex(newIndex));

      toast.success("Added to timeline.");
    },
    [
      dispatch,
      fallbackTrackIdForType,
      findTrackIdAtPoint,
      getTrackBounds,
      getUnboundedTimeFromClientX,
      handleDragHoverTrackId,
      isLibraryAssetDrag,
      mediaFiles,
      readLibraryAssetPayload,
      resolution,
      textElements,
      tracks,
    ],
  );

  const handleSplit = () => {
    if (!activeElement) {
      toast.error("No element selected.");
      return;
    }

    if (activeElement === "media") {
      const elements = [...mediaFiles];
      const element = elements[activeElementIndex];

      if (!element) {
        toast.error("No element selected.");
        return;
      }

      const { positionStart, positionEnd } = element;

      if (playheadTime <= positionStart || playheadTime >= positionEnd) {
        toast.error("Playhead is outside the selected element bounds.");
        return;
      }

      const positionDuration = positionEnd - positionStart;

      // Media logic (uses startTime/endTime for trimming)
      const { startTime, endTime } = element;
      const sourceDuration = endTime - startTime;
      const ratio = (playheadTime - positionStart) / positionDuration;
      const splitSourceOffset = startTime + ratio * sourceDuration;

      const firstPart = {
        ...element,
        id: crypto.randomUUID(),
        positionStart,
        positionEnd: playheadTime,
        startTime,
        endTime: splitSourceOffset,
      };

      const secondPart = {
        ...element,
        id: crypto.randomUUID(),
        positionStart: playheadTime,
        positionEnd,
        startTime: splitSourceOffset,
        endTime,
      };

      elements.splice(activeElementIndex, 1, firstPart, secondPart);
      dispatch(setMediaFiles(elements));
      dispatch(setActiveElement(null));
      toast.success("Element split successfully.");
      return;
    }

    if (activeElement === "text") {
      const elements = [...textElements];
      const element = elements[activeElementIndex];

      if (!element) {
        toast.error("No element selected.");
        return;
      }

      const { positionStart, positionEnd } = element;

      if (playheadTime <= positionStart || playheadTime >= positionEnd) {
        toast.error("Playhead is outside the selected element.");
        return;
      }

      const firstPart = {
        ...element,
        id: crypto.randomUUID(),
        positionStart,
        positionEnd: playheadTime,
      };

      const secondPart = {
        ...element,
        id: crypto.randomUUID(),
        positionStart: playheadTime,
        positionEnd,
      };

      elements.splice(activeElementIndex, 1, firstPart, secondPart);
      dispatch(setTextElements(elements));
      dispatch(setActiveElement(null));
      toast.success("Element split successfully.");
      return;
    }

    toast.error("Split is only supported for media or text elements.");
  };

  const handleDuplicate = () => {
    if (!activeElement) {
      toast.error("No element selected.");
      return;
    }

    const nextId = crypto.randomUUID();

    if (activeElement === "media") {
      const element = mediaFiles[activeElementIndex];
      if (!element) {
        toast.error("No element selected.");
        return;
      }

      const resolvedTrackId =
        element.trackId ?? fallbackTrackIdForType[element.type] ?? null;
      if (!resolvedTrackId) {
        toast.error("Select a valid track before duplicating.");
        return;
      }

      const duration = Math.max(0, element.positionEnd - element.positionStart);
      const placement = computeRipplePlacement({
        clips: getTrackBounds(resolvedTrackId),
        movingId: nextId,
        desiredStart: element.positionEnd,
        duration,
      });

      const shiftedMediaFiles = mediaFiles.map((clip) => {
        const delta = placement.shifts[clip.id];
        if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) {
          return clip;
        }
        return {
          ...clip,
          positionStart: clip.positionStart + delta,
          positionEnd: clip.positionEnd + delta,
        };
      });

      const duplicated = {
        ...element,
        id: nextId,
        trackId: resolvedTrackId,
        positionStart: placement.start,
        positionEnd: placement.end,
      };

      shiftedMediaFiles.splice(activeElementIndex + 1, 0, duplicated);

      const shiftedTextElements = textElements.map((clip) => {
        const delta = placement.shifts[clip.id];
        if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) {
          return clip;
        }
        return {
          ...clip,
          positionStart: clip.positionStart + delta,
          positionEnd: clip.positionEnd + delta,
        };
      });

      dispatch(
        applyTimelineEdit({
          mediaFiles: shiftedMediaFiles,
          textElements: shiftedTextElements,
        }),
      );
      dispatch(setActiveElement(null));
      toast.success("Element duplicated successfully.");
      return;
    }

    const element = textElements[activeElementIndex];
    if (!element) {
      toast.error("No element selected.");
      return;
    }

    const resolvedTrackId = element.trackId ?? fallbackTextTrackId ?? null;
    if (!resolvedTrackId) {
      toast.error("Select a valid track before duplicating.");
      return;
    }

    const duration = Math.max(0, element.positionEnd - element.positionStart);
    const placement = computeRipplePlacement({
      clips: getTrackBounds(resolvedTrackId),
      movingId: nextId,
      desiredStart: element.positionEnd,
      duration,
    });

    const shiftedTextElements = textElements.map((clip) => {
      const delta = placement.shifts[clip.id];
      if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) {
        return clip;
      }
      return {
        ...clip,
        positionStart: clip.positionStart + delta,
        positionEnd: clip.positionEnd + delta,
      };
    });

    const duplicated = {
      ...element,
      id: nextId,
      trackId: resolvedTrackId,
      positionStart: placement.start,
      positionEnd: placement.end,
    };

    shiftedTextElements.splice(activeElementIndex + 1, 0, duplicated);

    const shiftedMediaFiles = mediaFiles.map((clip) => {
      const delta = placement.shifts[clip.id];
      if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) {
        return clip;
      }
      return {
        ...clip,
        positionStart: clip.positionStart + delta,
        positionEnd: clip.positionEnd + delta,
      };
    });

    dispatch(
      applyTimelineEdit({
        mediaFiles: shiftedMediaFiles,
        textElements: shiftedTextElements,
      }),
    );
    dispatch(setActiveElement(null));
    toast.success("Element duplicated successfully.");
  };

  const handleDelete = () => {
    if (!activeElement) {
      if (markerAtPlayhead) {
        dispatch(deleteMarker(markerAtPlayhead.id));
        setSelectedMarkerId(null);
        return;
      }
      toast.error("No element selected.");
      return;
    }

    if (activeElement === "media") {
      const element = mediaFiles[activeElementIndex];
      if (!element) {
        toast.error("No element selected.");
        return;
      }
      dispatch(setMediaFiles(mediaFiles.filter((ele) => ele.id !== element.id)));
      dispatch(setActiveElement(null));
      toast.success("Element deleted successfully.");
      return;
    }

    if (activeElement === "text") {
      const element = textElements[activeElementIndex];
      if (!element) {
        toast.error("No element selected.");
        return;
      }
      dispatch(setTextElements(textElements.filter((ele) => ele.id !== element.id)));
      dispatch(setActiveElement(null));
      toast.success("Element deleted successfully.");
      return;
    }

    toast.error("Delete is only supported for media or text elements.");
  };

  const getTimeFromClientX = useCallback(
    (clientX: number) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const scrollOffset = timelineRef.current.scrollLeft;
      const offsetX = clientX - rect.left + scrollOffset - TRACK_LABEL_WIDTH_PX;
      const seconds = Math.max(0, offsetX) / zoom;
      return Math.max(0, Math.min(safeDuration, seconds));
    },
    [safeDuration, zoom],
  );

  const setTimeFromClientX = useCallback(
    (clientX: number) => {
      const clampedTime = getTimeFromClientX(clientX);
      if (typeof clampedTime !== "number") return;
      dispatch(setIsPlaying(false));
      dispatch(setCurrentTime(clampedTime));
      player?.seekTo(Math.round(clampedTime * safeFps));
      return clampedTime;
    },
    [dispatch, getTimeFromClientX, player, safeFps],
  );

  const clearSelection = useCallback(() => {
    dispatch(setActiveElement(null));
    dispatch(setActiveElementIndex(0));
  }, [dispatch]);

  const handleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    setTimeFromClientX(e.clientX);
    setSelectedMarkerId(null);

    const target = e.target as HTMLElement | null;
    const clickedInteractive =
      target instanceof HTMLElement &&
      (target.closest('[data-timeline-clip="true"]') ||
        target.closest('[data-timeline-interactive="true"]'));
    if (!clickedInteractive) {
      clearSelection();
    }
  };

  useEffect(() => {
    if (!enableMarkerTracking) return;
    const el = timelineRef.current;
    if (!el) return;
    const playheadX = TRACK_LABEL_WIDTH_PX + playheadTime * zoom;

    const margin = 160;
    const left = el.scrollLeft;
    const right = left + el.clientWidth;

    if (playheadX < left + margin || playheadX > right - margin) {
      el.scrollTo({
        left: Math.max(0, playheadX - el.clientWidth / 2),
        behavior: isPlaying ? "auto" : "smooth",
      });
    }
  }, [enableMarkerTracking, isPlaying, playheadTime, zoom]);

  useEffect(() => {
    if (!isDraggingMarker) return;
    const handleMove = (event: MouseEvent) => {
      setTimeFromClientX(event.clientX);
    };
    const handleUp = () => {
      setIsDraggingMarker(false);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDraggingMarker, setTimeFromClientX]);

  const throttledMarkerUpdate = useMemo(
    () =>
      throttle((id: string, time: number) => {
        dispatch(updateMarker({ id, time }));
      }, 50),
    [dispatch],
  );

  useEffect(() => {
    return () => throttledMarkerUpdate.cancel();
  }, [throttledMarkerUpdate]);

  useEffect(() => {
    if (!draggingTimelineMarkerId) return;
    const handleMove = (event: MouseEvent) => {
      const time = getTimeFromClientX(event.clientX);
      if (typeof time !== "number") return;
      throttledMarkerUpdate(draggingTimelineMarkerId, time);
      dispatch(setCurrentTime(time));
      player?.seekTo(Math.round(time * safeFps));
    };
    const handleUp = () => {
      throttledMarkerUpdate.flush();
      dispatch(endHistoryTransaction());
      setDraggingTimelineMarkerId(null);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [
    dispatch,
    draggingTimelineMarkerId,
    getTimeFromClientX,
    player,
    safeFps,
    throttledMarkerUpdate,
  ]);

  const handleToggleMarker = useCallback(() => {
    if (markerAtPlayhead) {
      dispatch(deleteMarker(markerAtPlayhead.id));
      setSelectedMarkerId(null);
      return;
    }
    dispatch(addMarker({ time: playheadTime }));
  }, [dispatch, markerAtPlayhead, playheadTime]);

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <div className="flex w-full flex-row items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <TimelineToolButton
            icon={<Flag className="h-4 w-4" aria-hidden="true" />}
            label={markerAtPlayhead ? "Delete marker" : "Add marker"}
            shortcut="M"
            tooltip={
              markerAtPlayhead
                ? "Remove the marker at the current playhead time."
                : "Add a marker at the playhead to bookmark a moment on the timeline."
            }
            helpTitle="Markers"
            help={
              <>
                <p>
                  Markers are timeline bookmarks. Use them to flag moments to
                  review (beats, cuts, sync points) and jump around quickly.
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    <span className="font-medium text-foreground">
                      Add / delete at playhead:
                    </span>{" "}
                    Press <kbd className="rounded bg-muted px-1">M</kbd>. If the
                    playhead is already on a marker, the same action deletes it.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Jump:</span>{" "}
                    Click a marker triangle on the ruler to move the playhead to
                    that time.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Move:</span>{" "}
                    Drag a marker left/right to adjust its timestamp.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Delete:</span>{" "}
                    With no clip selected, press{" "}
                    <kbd className="rounded bg-muted px-1">Delete</kbd> or{" "}
                    <kbd className="rounded bg-muted px-1">Backspace</kbd> while
                    the playhead is on the marker.
                  </li>
                </ul>
              </>
            }
            onClick={handleToggleMarker}
            className={
              markerAtPlayhead
                ? "border-amber-500/30 bg-amber-500/10 text-white hover:bg-amber-500/15"
                : undefined
            }
          />

          <TimelineToolButton
            icon={<Scissors className="h-4 w-4" aria-hidden="true" />}
            label="Split"
            shortcut="S"
            tooltip="Split the selected clip at the playhead."
            helpTitle="Split"
            help={
              <>
                <p>
                  Split cuts the currently selected clip into two clips at the
                  playhead time.
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    Select a clip on the timeline, then press{" "}
                    <kbd className="rounded bg-muted px-1">S</kbd>.
                  </li>
                  <li>
                    The playhead must be inside the clip (not at the very start
                    or end).
                  </li>
                  <li>
                    For video/audio, the source trim is split so playback stays
                    continuous.
                  </li>
                </ul>
              </>
            }
            onClick={handleSplit}
          />

          <TimelineToolButton
            icon={<Copy className="h-4 w-4" aria-hidden="true" />}
            label="Duplicate"
            shortcut="D"
            tooltip="Duplicate the selected clip (ripple insert)."
            helpTitle="Duplicate"
            help={
              <>
                <p>
                  Duplicate creates a copy of the selected clip on the same
                  layer and places it after the original.
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    Press <kbd className="rounded bg-muted px-1">D</kbd> to
                    duplicate the selected clip.
                  </li>
                  <li>
                    The timeline uses ripple insert: if the copy would overlap
                    other clips on that layer, downstream clips shift right to
                    make room.
                  </li>
                </ul>
              </>
            }
            onClick={handleDuplicate}
          />

          <TimelineToolButton
            icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
            label="Delete"
            shortcut="Del"
            tooltip="Delete the selected clip."
            helpTitle="Delete"
            help={
              <>
                <p>Delete removes the selected clip from the timeline.</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    Press{" "}
                    <kbd className="rounded bg-muted px-1">Delete</kbd> or{" "}
                    <kbd className="rounded bg-muted px-1">Backspace</kbd>.
                  </li>
                  <li>
                    If no clip is selected and the playhead is on a marker, the
                    same shortcut deletes that marker.
                  </li>
                  <li>
                    This removes the timeline instance only — the original media
                    stays in your library.
                  </li>
                </ul>
              </>
            }
            onClick={handleDelete}
            className="border-[color:var(--brand-accent)] bg-[color:var(--brand-accent-soft)] text-[color:var(--brand-accent-strong)] hover:bg-[color:var(--brand-accent-soft)]"
          />
        </div>

        <div className="flex items-center gap-3">
          <TimelineToolButton
            icon={
              enableMarkerTracking ? (
                <LocateFixed className="h-4 w-4" aria-hidden="true" />
              ) : (
                <LocateOff className="h-4 w-4" aria-hidden="true" />
              )
            }
            label="Follow playhead"
            shortcut="F"
            tooltip="Auto-scroll the timeline viewport to keep the playhead visible while time changes."
            helpTitle="Follow playhead"
            help={
              <>
                <p>
                  Follow playhead controls whether the timeline viewport
                  auto-scrolls to keep the red playhead in view as time changes.
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    <span className="font-medium text-foreground">On:</span> the
                    timeline scrolls as the playhead moves, so it stays visible
                    while playing or scrubbing.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Off:</span>{" "}
                    the timeline stays where you left it; you can scroll
                    manually.
                  </li>
                  <li>
                    This changes the viewport only — it does not affect your
                    export.
                  </li>
                </ul>
              </>
            }
            onClick={() => dispatch(setMarkerTrack(!enableMarkerTracking))}
            className={
              enableMarkerTracking
                ? "border-blue-500/25 bg-blue-500/15 text-white hover:bg-blue-500/20"
                : undefined
            }
          />

          <div className="flex items-center gap-2">
            <span className="select-none text-lg text-white/70">-</span>
            <input
              type="range"
              min={30}
              max={150}
              step="1"
              value={zoom}
              onChange={(e) => throttledZoom(Number(e.target.value))}
              className="w-[140px] rounded border border-white/10 bg-black/30 text-white shadow-sm focus:border-white/20 focus:outline-none"
              aria-label="Timeline zoom"
            />
            <span className="select-none text-lg text-white/70">+</span>

            <Dialog open={timelineHelpOpen} onOpenChange={setTimelineHelpOpen}>
              <TooltipProvider delayDuration={250}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setTimelineHelpOpen(true)}
                      className="h-9 w-9 rounded-md border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-0"
                      aria-label="Timeline shortcuts and help"
                    >
                      <Info className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="end" className="max-w-[320px]">
                    <div className="text-xs font-semibold text-popover-foreground">
                      Timeline shortcuts
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Alt/Option + scroll to zoom. Shift + scroll to pan
                      horizontally.
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Timeline shortcuts</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <p>
                    Use these shortcuts to navigate the timeline quickly while
                    editing.
                  </p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>
                      <span className="font-medium text-foreground">Zoom:</span>{" "}
                      Hold{" "}
                      <kbd className="rounded bg-muted px-1">Alt</kbd> /{" "}
                      <kbd className="rounded bg-muted px-1">Option</kbd> and
                      scroll to zoom under your cursor.
                    </li>
                    <li>
                      <span className="font-medium text-foreground">Pan:</span>{" "}
                      Hold{" "}
                      <kbd className="rounded bg-muted px-1">Shift</kbd> and
                      scroll to pan the timeline horizontally.
                    </li>
                    <li>
                      <span className="font-medium text-foreground">
                        Follow playhead:
                      </span>{" "}
                      Press <kbd className="rounded bg-muted px-1">F</kbd> to
                      toggle auto-scroll.
                    </li>
                  </ul>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div
        className="relative min-h-0 w-full flex-1 overflow-auto border-t border-gray-800 bg-[#1E1D21] z-10"
        ref={timelineRef}
        onClick={handleClick}
        onDragOver={(e) => {
          if (!isLibraryAssetDrag(e.dataTransfer)) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "copy";
          handleDragHoverTrackId(findTrackIdAtPoint(e.clientX, e.clientY));
        }}
        onDragLeave={(e) => {
          if (!isLibraryAssetDrag(e.dataTransfer)) return;
          e.preventDefault();
          e.stopPropagation();
          handleDragHoverTrackId(null);
        }}
        onDrop={handleLibraryDrop}
      >
        <div className="relative" style={{ width: `${timelineCanvasWidthPx}px` }}>
	          <Header
	            labelWidth={TRACK_LABEL_WIDTH_PX}
	            totalSeconds={totalSeconds}
	            zoom={zoom}
	            onLabelClick={clearSelection}
	          />

          {markers.map((marker) => (
            <div
              key={marker.id}
              className="absolute top-0 bottom-0 z-40"
              style={{
                left: `${TRACK_LABEL_WIDTH_PX + marker.time * zoom}px`,
              }}
            >
              <div
                className={`absolute top-0 bottom-0 w-px ${
                  selectedMarkerId === marker.id
                    ? "bg-amber-400/40"
                    : "bg-amber-400/25"
                }`}
              />
              <button
                type="button"
                title={
                  typeof marker.label === "string" && marker.label.trim().length > 0
                    ? marker.label
                    : `${marker.time.toFixed(2)}s`
                }
                className={`absolute top-0 -translate-x-1/2 h-12 w-6 cursor-ew-resize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 ${
                  selectedMarkerId === marker.id ? "drop-shadow" : ""
                }`}
                style={{ left: 0 }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  dispatch(setIsPlaying(false));
                  dispatch(beginHistoryTransaction());
                  setSelectedMarkerId(marker.id);
                  setDraggingTimelineMarkerId(marker.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMarkerId(marker.id);
                  dispatch(setCurrentTime(marker.time));
                  player?.seekTo(Math.round(marker.time * safeFps));
                }}
                aria-label={`Marker at ${marker.time.toFixed(2)} seconds`}
              >
                <div
                  className={`mx-auto mt-1 h-0 w-0 border-x-[6px] border-x-transparent border-t-[10px] ${
                    selectedMarkerId === marker.id
                      ? "border-t-amber-300"
                      : "border-t-amber-400/90"
                  }`}
                />
              </button>
            </div>
          ))}

          {typeof snapGuideTime === "number" && Number.isFinite(snapGuideTime) ? (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-40 w-[2px] bg-blue-500/80"
              style={{
                left: `${TRACK_LABEL_WIDTH_PX + snapGuideTime * zoom}px`,
              }}
            />
          ) : null}

          <div
            className="pointer-events-none absolute top-0 bottom-0 z-50 w-[2px] bg-[color:var(--brand-accent)]"
            style={{
              left: `${TRACK_LABEL_WIDTH_PX + playheadTime * zoom}px`,
            }}
          />
          <button
            type="button"
            className="absolute top-0 z-50 h-12 w-6 -translate-x-1/2 cursor-ew-resize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-opacity-50"
            data-timeline-interactive="true"
            style={{
              left: `${TRACK_LABEL_WIDTH_PX + playheadTime * zoom}px`,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsDraggingMarker(true);
            }}
            aria-label="Drag playhead"
          >
            <div className="mx-auto mt-1 h-0 w-0 border-x-[6px] border-x-transparent border-t-[10px] border-t-[color:var(--brand-accent)]" />
          </button>

          <div className="divide-y divide-white/10">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `${TRACK_LABEL_WIDTH_PX}px 1fr`,
              }}
            >
	              <div
	                className={`sticky left-0 z-20 flex h-8 items-center gap-2 border-r bg-[#1E1D21] px-3 ${
	                  layerInsertPreview === "top"
	                    ? "border-blue-500/20 text-blue-200/90"
	                    : "border-white/10"
	                }`}
	                onClick={(e) => {
	                  e.stopPropagation();
	                  clearSelection();
	                }}
	                onDoubleClick={(e) => e.stopPropagation()}
	              >
                {layerInsertPreview === "top" ? (
                  <>
                    <Layers className="h-4 w-4" aria-hidden="true" />
                    <span className="text-[10px] font-semibold tracking-wide uppercase">
                      New layer
                    </span>
                  </>
                ) : null}
              </div>
              <div
                className={`relative h-8 ${
                  layerInsertPreview === "top" ? "bg-blue-500/10" : "bg-[#16151A]"
                }`}
                data-timeline-track-id="__new-layer-top"
              >
                <div
                  className={`flex h-full items-center justify-center border-b border-dashed text-[10px] ${
                    layerInsertPreview === "top"
                      ? "border-blue-500/30 text-blue-200/90"
                      : "border-white/10 text-white/35"
                  }`}
                >
                  {layerInsertPreview === "top"
                    ? "Release to create a new layer above"
                    : "Drop to create a new layer"}
                </div>
              </div>
            </div>

            {displayTracks.map((track) => (
              <div
                key={track.id}
                className="grid"
                style={{
                  gridTemplateColumns: `${TRACK_LABEL_WIDTH_PX}px 1fr`,
                }}
              >
	                <div
	                  className="sticky left-0 z-20 flex h-16 items-center gap-2 border-r border-white/10 bg-[#1E1D21] px-3 text-white/80"
	                  onClick={(e) => {
	                    e.stopPropagation();
	                    clearSelection();
	                  }}
	                  onDoubleClick={(e) => e.stopPropagation()}
	                >
                  <Layers className="h-4 w-4 text-white/60" aria-hidden="true" />
                  <span className="text-xs font-medium tracking-wide uppercase">
                    {track.name}
                  </span>
                </div>

                <div
                  className={`relative h-16 overflow-visible bg-[#1B1A1E] ${
                    hoveredTrackId === track.id ? "bg-blue-500/10" : ""
                  }`}
                  data-timeline-track-id={track.id}
                >
                  <MediaTimelineTrack
                    trackId={track.id}
                    mediaTypes={["video", "image", "audio"]}
                    fallbackTrackIdForType={fallbackTrackIdForType}
                    fallbackTextTrackId={fallbackTextTrackId}
                    onDragHoverTrackId={handleDragHoverTrackId}
                    onSnapGuideTimeChange={handleSnapGuideTimeChange}
                  />
                  <TextTimeline
                    trackId={track.id}
                    fallbackTrackId={fallbackTextTrackId}
                    onDragHoverTrackId={handleDragHoverTrackId}
                    onSnapGuideTimeChange={handleSnapGuideTimeChange}
                  />
                </div>
              </div>
            ))}

            <div
              className="grid"
              style={{
                gridTemplateColumns: `${TRACK_LABEL_WIDTH_PX}px 1fr`,
              }}
            >
	              <div
	                className={`sticky left-0 z-20 flex h-8 items-center gap-2 border-r bg-[#1E1D21] px-3 ${
	                  layerInsertPreview === "bottom"
	                    ? "border-blue-500/20 text-blue-200/90"
	                    : "border-white/10"
	                }`}
	                onClick={(e) => {
	                  e.stopPropagation();
	                  clearSelection();
	                }}
	                onDoubleClick={(e) => e.stopPropagation()}
	              >
                {layerInsertPreview === "bottom" ? (
                  <>
                    <Layers className="h-4 w-4" aria-hidden="true" />
                    <span className="text-[10px] font-semibold tracking-wide uppercase">
                      New layer
                    </span>
                  </>
                ) : null}
              </div>
              <div
                className={`relative h-8 ${
                  layerInsertPreview === "bottom"
                    ? "bg-blue-500/10"
                    : "bg-[#16151A]"
                }`}
                data-timeline-track-id="__new-layer-bottom"
              >
                <div
                  className={`flex h-full items-center justify-center border-t border-dashed text-[10px] ${
                    layerInsertPreview === "bottom"
                      ? "border-blue-500/30 text-blue-200/90"
                      : "border-white/10 text-white/35"
                  }`}
                >
                  {layerInsertPreview === "bottom"
                    ? "Release to create a new layer below"
                    : "Drop to create a new layer"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <GlobalKeyHandlerProps
        handleDuplicate={handleDuplicate}
        handleSplit={handleSplit}
        handleDelete={handleDelete}
      />
    </div>
  );
};

export default memo(Timeline);
