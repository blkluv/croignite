"use client";

import Moveable, { OnDrag, OnResize, OnRotate } from "react-moveable";
import { useAppDispatch, useAppSelector } from "@/app/store";
import {
  beginHistoryTransaction,
  endHistoryTransaction,
  setMediaFiles,
  setTextElements,
} from "@/app/store/slices/projectSlice";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { throttle } from "lodash";
import type { MediaFile, TextElement } from "@/app/types";
import { createPortal } from "react-dom";
import { useEditorPlayer } from "./EditorPlayerContext";

function MoveableOverlay() {
  const dispatch = useAppDispatch();
  const { editingTextId, player } = useEditorPlayer();
  const {
    activeElement,
    activeElementIndex,
    mediaFiles,
    textElements,
    resolution,
    currentTime,
  } = useAppSelector((state) => state.projectState);

  const targetRef = useRef<HTMLElement | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const moveableRef = useRef<Moveable | null>(null);
  const updateRectRafRef = useRef<number | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );
  const [containerScale, setContainerScale] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [centerGuides, setCenterGuides] = useState({
    vertical: false,
    horizontal: false,
  });
  const hideGuidesTimerRef = useRef<number | null>(null);

  const selected = useMemo<MediaFile | TextElement | null>(() => {
    if (activeElement === "media") {
      return mediaFiles[activeElementIndex] ?? null;
    }
    if (activeElement === "text") {
      return textElements[activeElementIndex] ?? null;
    }
    return null;
  }, [activeElement, activeElementIndex, mediaFiles, textElements]);

  const selectedId = selected?.id ?? null;

  const scheduleUpdateRect = useCallback(() => {
    if (updateRectRafRef.current !== null) {
      window.cancelAnimationFrame(updateRectRafRef.current);
    }
    updateRectRafRef.current = window.requestAnimationFrame(() => {
      moveableRef.current?.updateRect?.();
      updateRectRafRef.current = null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (updateRectRafRef.current !== null) {
        window.cancelAnimationFrame(updateRectRafRef.current);
        updateRectRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      targetRef.current = null;
      setTarget(null);
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;
    let handleFrameUpdate: (() => void) | null = null;
    const selector = `.id-${selectedId}`;

    const syncTarget = () => {
      if (cancelled) return null;
      const el = document.querySelector(selector) as HTMLElement | null;
      targetRef.current = el;
      setTarget((prev) => (prev === el ? prev : el));
      return el;
    };

    const rafId = window.requestAnimationFrame(() => {
      const resolved = syncTarget();
      scheduleUpdateRect();

      if (resolved) return;
      if (!player) return;

      handleFrameUpdate = () => {
        const next = syncTarget();
        scheduleUpdateRect();
        if (next) {
          player.removeEventListener("frameupdate", handleFrameUpdate as () => void);
          handleFrameUpdate = null;
          if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
            timeoutId = null;
          }
        }
      };

      player.addEventListener("frameupdate", handleFrameUpdate);
      timeoutId = window.setTimeout(() => {
        if (handleFrameUpdate) {
          player.removeEventListener("frameupdate", handleFrameUpdate);
          handleFrameUpdate = null;
        }
      }, 750);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (handleFrameUpdate) {
        player?.removeEventListener("frameupdate", handleFrameUpdate);
        handleFrameUpdate = null;
      }
    };
  }, [currentTime, player, scheduleUpdateRect, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    scheduleUpdateRect();
  }, [scheduleUpdateRect, selectedId, selected, containerScale]);

  useEffect(() => {
    const container = document.querySelector(
      ".__remotion-player",
    ) as HTMLElement | null;
    setPortalContainer(container);
  }, []);

  useEffect(() => {
    if (!portalContainer) return;
    const computed = window.getComputedStyle(portalContainer);
    if (computed.position === "static") {
      portalContainer.style.position = "relative";
    }
  }, [portalContainer]);

  useEffect(() => {
    if (!portalContainer) return;

    const updateMetrics = () => {
      const rect = portalContainer.getBoundingClientRect();
      const scaleX = rect.width / portalContainer.offsetWidth;
      const scaleY = rect.height / portalContainer.offsetHeight;
      const safeScaleX = Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1;
      const safeScaleY = Number.isFinite(scaleY) && scaleY > 0 ? scaleY : 1;
      setContainerScale(Math.min(safeScaleX, safeScaleY));

      const width = portalContainer.offsetWidth;
      const height = portalContainer.offsetHeight;
      setCanvasSize({
        width: Number.isFinite(width) && width > 0 ? width : 0,
        height: Number.isFinite(height) && height > 0 ? height : 0,
      });
    };

    updateMetrics();
    window.addEventListener("resize", updateMetrics);
    return () => {
      window.removeEventListener("resize", updateMetrics);
    };
  }, [portalContainer]);

  const updateSelected = useMemo(
    () =>
      throttle((updates: Partial<MediaFile> | Partial<TextElement>) => {
        if (!selected) return;
        if (activeElement === "media") {
          const updated = mediaFiles.map((m, idx) =>
            idx === activeElementIndex ? { ...m, ...updates } : m,
          );
          dispatch(setMediaFiles(updated));
        } else if (activeElement === "text") {
          const updated = textElements.map((t, idx) =>
            idx === activeElementIndex ? { ...t, ...updates } : t,
          );
          dispatch(setTextElements(updated));
        }
      }, 50),
    [
      dispatch,
      activeElement,
      activeElementIndex,
      mediaFiles,
      textElements,
      selected,
    ],
  );

  const canRender = Boolean(selected && target && portalContainer && !editingTextId);

  const isFiniteNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

  const keepRatio =
    activeElement === "media" &&
    selected !== null &&
    (selected as MediaFile).type !== undefined &&
    ((selected as MediaFile).type === "image" ||
      (selected as MediaFile).type === "video");

  const snapWidth =
    canvasSize.width > 0
      ? canvasSize.width
      : typeof resolution?.width === "number" && Number.isFinite(resolution.width)
        ? resolution.width
        : 1920;
  const snapHeight =
    canvasSize.height > 0
      ? canvasSize.height
      : typeof resolution?.height === "number" && Number.isFinite(resolution.height)
        ? resolution.height
        : 1080;

  const baseResolutionWidth =
    typeof resolution?.width === "number" && Number.isFinite(resolution.width) && resolution.width > 0
      ? resolution.width
      : 1920;
  const baseResolutionHeight =
    typeof resolution?.height === "number" && Number.isFinite(resolution.height) && resolution.height > 0
      ? resolution.height
      : 1080;

  const stateToCanvasScale = (() => {
    if (canvasSize.width <= 0 || canvasSize.height <= 0) return 1;
    const scaleX = canvasSize.width / baseResolutionWidth;
    const scaleY = canvasSize.height / baseResolutionHeight;
    const scale = Math.min(scaleX, scaleY);
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  })();

  const centerX = snapWidth / 2;
  const centerY = snapHeight / 2;

  const patchTransformRotation = (value: string, rotation: number) => {
    const nextRotation = `rotate(${rotation}deg)`;
    if (!value || value === "none") return nextRotation;
    if (/\brotate\([^)]+\)/.test(value)) {
      return value.replace(/\brotate\([^)]+\)/, nextRotation);
    }
    return `${value} ${nextRotation}`;
  };

  const clearGuideTimer = useCallback(() => {
    if (hideGuidesTimerRef.current) {
      window.clearTimeout(hideGuidesTimerRef.current);
      hideGuidesTimerRef.current = null;
    }
  }, []);

  const scheduleHideGuides = useCallback(
    (delayMs: number) => {
      clearGuideTimer();
      hideGuidesTimerRef.current = window.setTimeout(() => {
        setCenterGuides({ vertical: false, horizontal: false });
        hideGuidesTimerRef.current = null;
      }, delayMs);
    },
    [clearGuideTimer],
  );

  useEffect(() => {
    return () => clearGuideTimer();
  }, [clearGuideTimer]);

  const updateCenterGuides = useCallback(
    (next: { vertical: boolean; horizontal: boolean }) => {
      clearGuideTimer();
      setCenterGuides((prev) =>
        prev.vertical === next.vertical && prev.horizontal === next.horizontal
          ? prev
          : next,
      );
    },
    [clearGuideTimer],
  );

  if (!canRender) return null;

  return createPortal(
    <>
      <div className="pointer-events-none absolute inset-0 z-40">
        {centerGuides.vertical ? (
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-cyan-300/70" />
        ) : null}
        {centerGuides.horizontal ? (
          <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-cyan-300/70" />
        ) : null}
      </div>

      <Moveable
        ref={moveableRef}
        target={target}
        container={portalContainer}
        origin={false}
        draggable
        throttleDrag={0}
        resizable
        throttleResize={0}
        rotatable
        throttleRotate={0}
        keepRatio={keepRatio}
        renderDirections={["nw", "n", "ne", "e", "se", "s", "sw", "w"]}
        linePadding={6}
        controlPadding={8}
        zoom={containerScale > 0 ? 1 / containerScale : 1}
        className="moveable-canvas"
        useResizeObserver
        snappable
        snapGap={false}
        snapDirections={{
          left: false,
          top: false,
          right: false,
          bottom: false,
          center: true,
          middle: true,
        }}
        elementSnapDirections={false}
        snapHorizontalThreshold={8}
        snapVerticalThreshold={8}
        snapRenderThreshold={8}
        isDisplaySnapDigit={false}
        verticalGuidelines={[centerX]}
        horizontalGuidelines={[centerY]}
        onDragStart={() => {
          clearGuideTimer();
          dispatch(beginHistoryTransaction());
        }}
        onDrag={({ target, left, top }: OnDrag) => {
          if (!target) return;
          target.style.left = `${left}px`;
          target.style.top = `${top}px`;
	          updateSelected({
	            x: left / stateToCanvasScale,
	            y: top / stateToCanvasScale,
	          });

          const htmlTarget = target as HTMLElement;
          const width = htmlTarget.offsetWidth;
          const height = htmlTarget.offsetHeight;
          const nearVertical =
            isFiniteNumber(width) && width > 0
              ? Math.abs(left + width / 2 - centerX) <= 8
              : false;
          const nearHorizontal =
            isFiniteNumber(height) && height > 0
              ? Math.abs(top + height / 2 - centerY) <= 8
              : false;
          updateCenterGuides({ vertical: nearVertical, horizontal: nearHorizontal });
        }}
        onDragEnd={() => {
          scheduleHideGuides(1000);
          updateSelected.flush();
          dispatch(endHistoryTransaction());
        }}
        onResizeStart={() => {
          clearGuideTimer();
          dispatch(beginHistoryTransaction());
        }}
        onResize={({ target, width, height, drag, delta }: OnResize) => {
          if (!target) return;

          if (delta[0] && isFiniteNumber(width)) target.style.width = `${width}px`;
          if (delta[1] && isFiniteNumber(height))
            target.style.height = `${height}px`;
          if (drag) {
            if (isFiniteNumber(drag.left)) target.style.left = `${drag.left}px`;
            if (isFiniteNumber(drag.top)) target.style.top = `${drag.top}px`;
          }

          const nextLeft = isFiniteNumber(drag?.left)
            ? drag.left
            : isFiniteNumber(selected?.x)
              ? selected.x * stateToCanvasScale
              : 0;
          const nextTop = isFiniteNumber(drag?.top)
            ? drag.top
            : isFiniteNumber(selected?.y)
              ? selected.y * stateToCanvasScale
              : 0;
          const htmlTarget = target as HTMLElement;
          const nextWidth = isFiniteNumber(width) ? width : htmlTarget.offsetWidth;
          const nextHeight = isFiniteNumber(height) ? height : htmlTarget.offsetHeight;

          const nearVertical =
            isFiniteNumber(nextWidth) && nextWidth > 0
              ? Math.abs(nextLeft + nextWidth / 2 - centerX) <= 8
              : false;
          const nearHorizontal =
            isFiniteNumber(nextHeight) && nextHeight > 0
              ? Math.abs(nextTop + nextHeight / 2 - centerY) <= 8
              : false;
          updateCenterGuides({ vertical: nearVertical, horizontal: nearHorizontal });

          if (activeElement === "media") {
            const media = selected as MediaFile;
            const prevCrop = media.crop ?? {
              x: 0,
              y: 0,
              width: media.width ?? 1,
              height: media.height ?? 1,
            };
            const prevBoundsWidth = prevCrop.width || media.width || 1;
            const prevBoundsHeight = prevCrop.height || media.height || 1;

            const nextBoundsWidth = isFiniteNumber(width)
              ? Math.max(1, width / stateToCanvasScale)
              : prevBoundsWidth;
            const nextBoundsHeight = isFiniteNumber(height)
              ? Math.max(1, height / stateToCanvasScale)
              : prevBoundsHeight;

            const scaleX =
              prevBoundsWidth > 0 ? nextBoundsWidth / prevBoundsWidth : 1;
            const scaleY =
              prevBoundsHeight > 0 ? nextBoundsHeight / prevBoundsHeight : 1;

            const nextWidth = Math.round((media.width ?? prevBoundsWidth) * scaleX);
            const nextHeight = Math.round(
              (media.height ?? prevBoundsHeight) * scaleY,
            );

	            updateSelected({
	              width: nextWidth,
	              height: nextHeight,
	              crop: {
	                x: Math.round((prevCrop.x || 0) * scaleX),
                y: Math.round((prevCrop.y || 0) * scaleY),
                width: Math.round(nextBoundsWidth),
                height: Math.round(nextBoundsHeight),
              },
	              ...(isFiniteNumber(drag?.left)
	                ? { x: drag.left / stateToCanvasScale }
	                : {}),
	              ...(isFiniteNumber(drag?.top) ? { y: drag.top / stateToCanvasScale } : {}),
	            });
	            return;
	          }

	          updateSelected({
	            ...(isFiniteNumber(width) ? { width: width / stateToCanvasScale } : {}),
	            ...(isFiniteNumber(height) ? { height: height / stateToCanvasScale } : {}),
	            ...(isFiniteNumber(drag?.left)
	              ? { x: drag.left / stateToCanvasScale }
	              : {}),
	            ...(isFiniteNumber(drag?.top) ? { y: drag.top / stateToCanvasScale } : {}),
	          });
	        }}
        onResizeEnd={() => {
          scheduleHideGuides(1000);
          updateSelected.flush();
          dispatch(endHistoryTransaction());
        }}
        onRotateStart={() => {
          clearGuideTimer();
          dispatch(beginHistoryTransaction());
        }}
        onRotate={({ target, beforeRotate }: OnRotate) => {
          if (!target) return;
          const nextRotation =
            typeof beforeRotate === "number" && Number.isFinite(beforeRotate)
              ? beforeRotate
              : 0;
	          target.style.transform = patchTransformRotation(
	            target.style.transform,
	            nextRotation,
	          );
	          updateSelected({ rotation: nextRotation });
	        }}
        onRotateEnd={() => {
          scheduleHideGuides(1000);
          updateSelected.flush();
          dispatch(endHistoryTransaction());
        }}
      />
    </>,
    portalContainer as Element,
  );
}

export default memo(MoveableOverlay);
