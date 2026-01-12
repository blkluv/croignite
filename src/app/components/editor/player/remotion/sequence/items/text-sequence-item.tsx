import { TextElement } from "@/app/types";
import { useAppDispatch, useAppSelector } from "@/app/store";
import {
  setActiveElement,
  setActiveElementIndex,
  setIsPlaying,
  setTextElements,
} from "@/app/store/slices/projectSlice";
import {
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { useEffect, useMemo, useRef } from "react";
import { useEditorPlayer } from "@/app/components/editor/player/remotion/EditorPlayerContext";
import { calculateSequenceFrames } from "../timing";

interface SequenceItemOptions {
  handleTextChange?: (id: string, text: string) => void;
  fps: number;
  renderScale: number;
  editableTextId?: string | null;
  currentTime?: number;
}

export const TextSequenceItem: React.FC<{
  item: TextElement;
  options: SequenceItemOptions;
}> = ({ item, options }) => {
  const { fps, renderScale } = options;
  const dispatch = useAppDispatch();
  const { editingTextId, startInlineTextEdit, stopInlineTextEdit } =
    useEditorPlayer();
  const { textElements, tracks, activeElement, activeElementIndex } = useAppSelector(
    (state) => state.projectState,
  );
  const safeRenderScale =
    typeof renderScale === "number" && Number.isFinite(renderScale) && renderScale > 0
      ? renderScale
      : 1;
  const frame = useCurrentFrame();
  const videoConfig = useVideoConfig();
  const textRef = useRef<HTMLDivElement | null>(null);
  const originalTextRef = useRef<string | null>(null);

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

  const isSelected =
    activeElement === "text" && textElements[activeElementIndex]?.id === item.id;

  const isEditing = editingTextId === item.id;

  const commitInlineEdit = useMemo(() => {
    return () => {
      const el = textRef.current;
      if (!el) {
        stopInlineTextEdit();
        originalTextRef.current = null;
        return;
      }

      const nextText = (el.innerText ?? "").replace(/\r\n/g, "\n");
      const current = item.text ?? "";

      if (nextText !== current) {
        dispatch(
          setTextElements(
            textElements.map((t) => (t.id === item.id ? { ...t, text: nextText } : t)),
          ),
        );
      }

      stopInlineTextEdit();
      originalTextRef.current = null;
    };
  }, [dispatch, item.id, item.text, stopInlineTextEdit, textElements]);

  useEffect(() => {
    if (!isEditing) return;
    originalTextRef.current = item.text ?? "";
    const el = textRef.current;
    if (!el) return;

    el.focus();
    const selection = window.getSelection?.();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, [isEditing, item.text]);

  const localFrame = frame - from;
  const totalFrames = durationInFrames;
  const fadeInFrames = Math.floor(
    (item.fadeInDuration ?? 0.4) * videoConfig.fps,
  );
  const fadeOutFrames = Math.floor(
    (item.fadeOutDuration ?? 0.4) * videoConfig.fps,
  );

  const opacity = (() => {
    const fadeIn = interpolate(localFrame, [0, fadeInFrames], [0, 1], {
      extrapolateRight: "clamp",
    });
    const fadeOutStart = Math.max(totalFrames - fadeOutFrames, 0);
    const fadeOut = interpolate(
      localFrame,
      [fadeOutStart, totalFrames],
      [1, 0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );
    return Math.min(fadeIn, fadeOut);
  })();

  const animationTransform = (() => {
    switch (item.animation) {
      case "slide-in":
      case "slide-up":
        const slideY = interpolate(localFrame, [0, fadeInFrames], [30 * safeRenderScale, 0], {
          easing: Easing.out(Easing.cubic),
          extrapolateRight: "clamp",
        });
        return `translateY(${slideY}px)`;
      case "zoom":
        const scale = interpolate(localFrame, [0, fadeInFrames], [0.9, 1], {
          easing: Easing.out(Easing.cubic),
          extrapolateRight: "clamp",
        });
        return `scale(${scale})`;
      case "bounce":
        const bounce = interpolate(localFrame, [0, fadeInFrames], [0.8, 1], {
          easing: Easing.elastic(1),
          extrapolateRight: "clamp",
        });
        return `scale(${bounce})`;
      case "fade":
      case "none":
      default:
        return "none";
    }
  })();

  const combinedTransform = (() => {
    const parts: string[] = [];
    if (animationTransform !== "none") parts.push(animationTransform);
    const rotation = item.rotation ?? 0;
    if (typeof rotation === "number" && Number.isFinite(rotation) && rotation !== 0) {
      parts.push(`rotate(${rotation}deg)`);
    }
    return parts.length > 0 ? parts.join(" ") : "none";
  })();

  return (
    <Sequence
      className={`designcombo-scene-item id-${item.id} designcombo-scene-item-type-text `}
      key={item.id}
      from={from}
      durationInFrames={durationInFrames}
      data-track-item="transition-element"
      style={{
        position: "absolute",
        width: (item.width ?? 3000) * safeRenderScale,
        height: (item.height ?? 400) * safeRenderScale,
        fontSize:
          typeof item.fontSize === "number" && Number.isFinite(item.fontSize)
            ? item.fontSize * safeRenderScale
            : 16 * safeRenderScale,
        top: item.y * safeRenderScale,
        left: item.x * safeRenderScale,
        color: item.color || "#000000",
        zIndex: effectiveZIndex,
        // backgroundColor: item.backgroundColor || "transparent",
        opacity: ((item.opacity ?? 100) / 100) * opacity,
        fontFamily: item.font || "Arial",
        transform: combinedTransform,
        transformOrigin: "center center",
        transition: "transform 0.2s ease",
        filter: item.blur ? `blur(${item.blur * safeRenderScale}px)` : "none",
      }}
    >
      <div
        data-text-id={item.id}
        ref={textRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        spellCheck={false}
        style={{
          height: "100%",
          boxShadow: "none",
          outline: "none",
          whiteSpace: "pre-wrap",
          backgroundColor: item.backgroundColor || "transparent",
          textAlign: item.align ?? "left",
          position: "relative",
          width: "100%",
          cursor: isEditing ? "text" : "pointer",
          userSelect: isEditing ? "text" : "none",
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (isEditing) return;
          if (isSelected) return;
          dispatch(setActiveElement("text"));
          const index = textElements.findIndex((clip) => clip.id === item.id);
          if (index >= 0) dispatch(setActiveElementIndex(index));
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          dispatch(setIsPlaying(false));
          if (!isSelected) {
            dispatch(setActiveElement("text"));
            const index = textElements.findIndex((clip) => clip.id === item.id);
            if (index >= 0) dispatch(setActiveElementIndex(index));
          }
          startInlineTextEdit(item.id);
        }}
        onKeyDown={(e) => {
          if (!isEditing) return;

          if (e.key === "Escape") {
            e.preventDefault();
            const original = originalTextRef.current ?? item.text ?? "";
            if (textRef.current) textRef.current.innerText = original;
            stopInlineTextEdit();
            originalTextRef.current = null;
            return;
          }

          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commitInlineEdit();
          }
        }}
        onBlur={() => {
          if (!isEditing) return;
          commitInlineEdit();
        }}
        className="designcombo_textLayer"
      >
        {item.text}
      </div>
    </Sequence>
  );
};
