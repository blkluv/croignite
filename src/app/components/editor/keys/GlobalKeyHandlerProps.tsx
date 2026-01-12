"use client";
import { useAppSelector } from "@/app/store";
import { useEffect, useRef } from "react";
import {
  addMarker,
  deleteMarker,
  setIsPlaying,
  setIsMuted,
  setCurrentTime,
  setMarkerTrack,
  undoState,
  redoState,
} from "@/app/store/slices/projectSlice";
import { useDispatch } from "react-redux";
import { useEditorPlayer } from "@/app/components/editor/player/remotion/EditorPlayerContext";

interface GlobalKeyHandlerProps {
  handleDuplicate: () => void;
  handleSplit: () => void;
  handleDelete: () => void;
}

const GlobalKeyHandler = ({
  handleDuplicate,
  handleSplit,
  handleDelete,
}: GlobalKeyHandlerProps) => {
  const projectState = useAppSelector((state) => state.projectState);
  const dispatch = useDispatch();
  const { player } = useEditorPlayer();

  const { duration, fps } = projectState;
  const safeFps =
    typeof fps === "number" && Number.isFinite(fps) && fps > 0 ? fps : 30;

  // Store latest state values in refs
  const isPlayingRef = useRef(projectState.isPlaying);
  const isMutedRef = useRef(projectState.isMuted);
  const currentTimeRef = useRef(projectState.currentTime);
  const enableMarkerTrackingRef = useRef(projectState.enableMarkerTracking);
  const markersRef = useRef(projectState.markers);

  useEffect(() => {
    isPlayingRef.current = projectState.isPlaying;
    isMutedRef.current = projectState.isMuted;
    currentTimeRef.current = projectState.currentTime;
    enableMarkerTrackingRef.current = projectState.enableMarkerTracking;
    markersRef.current = projectState.markers;
  }, [projectState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (isTyping) return;

      switch (e.code) {
        case "Space":
          if (e.repeat) return;
          e.preventDefault();
          e.stopPropagation();
          dispatch(setIsPlaying(!isPlayingRef.current));
          break;
        case "KeyU":
          e.preventDefault();
          dispatch(setIsMuted(!isMutedRef.current));
          break;
        case "KeyM":
          if (e.repeat) return;
          e.preventDefault();
          {
            const frame =
              player?.getCurrentFrame() ??
              Math.round(currentTimeRef.current * safeFps);
            const time = frame / safeFps;
            const eps = Math.max(0.04, 1 / safeFps);
            const marker =
              (markersRef.current ?? []).find((m) => Math.abs(m.time - time) <= eps) ??
              null;
            if (marker) dispatch(deleteMarker(marker.id));
            else dispatch(addMarker({ time }));
          }
          break;
        case "KeyZ":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            if (e.shiftKey) {
              dispatch(redoState());
            } else {
              dispatch(undoState());
            }
          }
          break;
        case "KeyD":
          if (e.repeat) return;
          e.preventDefault();
          handleDuplicate();
          break;
        case "KeyS":
          if (e.repeat) return;
          e.preventDefault();
          handleSplit();
          break;
        case "Delete":
        case "Backspace":
          if (e.repeat) return;
          e.preventDefault();
          handleDelete();
          break;
        case "KeyF":
          if (e.repeat) return;
          e.preventDefault();
          dispatch(setMarkerTrack(!enableMarkerTrackingRef.current));
          break;
        case "ArrowRight":
          e.preventDefault();
          if (isPlayingRef.current) return;
          const nextTime =
            currentTimeRef.current + 0.01 > duration
              ? 0
              : currentTimeRef.current + 0.01;
          dispatch(setCurrentTime(nextTime));
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (isPlayingRef.current) return;
          const prevTime =
            currentTimeRef.current - 0.01 > duration
              ? 0
              : currentTimeRef.current - 0.01;
          dispatch(setCurrentTime(prevTime));
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [
    handleDelete,
    handleDuplicate,
    handleSplit,
    duration,
    dispatch,
    player,
    safeFps,
  ]);

  return null;
};

export default GlobalKeyHandler;
