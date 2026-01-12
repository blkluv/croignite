"use client";

import { useAppDispatch, useAppSelector } from "@/app/store";
import { setTextElements } from "@/app/store/slices/projectSlice";
import type { TextElement } from "@/app/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { InspectorSection } from "./InspectorSection";

function NumberField(props: {
  id: string;
  label: string;
  value: number;
  onChange?: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  readOnly?: boolean;
}) {
  const { id, label, value, onChange, min, max, step, readOnly } = props;
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-white/70">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={onChange ? (e) => onChange(Number(e.target.value)) : undefined}
        min={min}
        max={max}
        step={step}
        readOnly={readOnly}
        className={cn(
          "border-white/10 bg-black/30 text-white focus-visible:ring-white/30 focus-visible:ring-offset-0",
          readOnly ? "opacity-80" : null,
        )}
      />
    </div>
  );
}

const normalizeColorInput = (value: string | undefined, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "transparent") return fallback;
  const match = trimmed.match(/^#([0-9a-fA-F]{6})/);
  return match ? `#${match[1]}` : fallback;
};

export default function TextProperties() {
  const { textElements, activeElementIndex } = useAppSelector(
    (state) => state.projectState,
  );
  const textElement = textElements[activeElementIndex];
  const dispatch = useAppDispatch();

  const ids = useMemo(() => {
    const base = textElement?.id ?? "none";
    return {
      content: `text-${base}-content`,
      start: `text-${base}-start`,
      end: `text-${base}-end`,
      x: `text-${base}-x`,
      y: `text-${base}-y`,
      width: `text-${base}-w`,
      height: `text-${base}-h`,
      rotation: `text-${base}-rotation`,
      zIndex: `text-${base}-z`,
      fontSize: `text-${base}-font-size`,
      font: `text-${base}-font`,
      align: `text-${base}-align`,
      color: `text-${base}-color`,
      background: `text-${base}-bg`,
      opacity: `text-${base}-opacity`,
      blur: `text-${base}-blur`,
      animation: `text-${base}-anim`,
      fadeIn: `text-${base}-fade-in`,
      fadeOut: `text-${base}-fade-out`,
    };
  }, [textElement?.id]);

  const onUpdateText = (id: string, updates: Partial<TextElement>) => {
    dispatch(
      setTextElements(
        textElements.map((text) =>
          text.id === id ? { ...text, ...updates } : text,
        ),
      ),
    );
  };

  if (!textElement) return null;

  const timelineDuration = Math.max(
    0,
    textElement.positionEnd - textElement.positionStart,
  );

  const title = (() => {
    const raw = textElement.text.trim();
    if (raw.length === 0) return "Shape";
    return raw.length > 56 ? `${raw.slice(0, 56)}…` : raw;
  })();
  const textColorValue = normalizeColorInput(textElement.color, "#ffffff");
  const backgroundColorValue = normalizeColorInput(
    textElement.backgroundColor,
    "#000000",
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="text-xs text-white/50">
            {timelineDuration.toFixed(2)}s on timeline · Double-click the canvas to
            edit inline.
          </div>
        </div>
      </div>

      <InspectorSection
        title="Content"
        description="Edit the text shown on screen."
      >
        <div className="space-y-2">
          <Label htmlFor={ids.content} className="text-xs text-white/70">
            Text
          </Label>
          <Textarea
            id={ids.content}
            value={textElement.text}
            onChange={(e) => onUpdateText(textElement.id, { text: e.target.value })}
            rows={4}
            className="border-white/10 bg-black/30 text-white placeholder:text-white/40 focus-visible:ring-white/30 focus-visible:ring-offset-0"
            placeholder="Type your title…"
          />
        </div>
      </InspectorSection>

      <InspectorSection
        title="Timing"
        description="Controlled primarily by dragging/resizing on the timeline."
      >
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            id={ids.start}
            label="Start (s)"
            value={textElement.positionStart}
            readOnly
          />
          <NumberField
            id={ids.end}
            label="End (s)"
            value={textElement.positionEnd}
            readOnly
          />
          <div className="col-span-2 text-xs text-white/50">
            Duration: {timelineDuration.toFixed(2)}s
          </div>
        </div>
      </InspectorSection>

      <InspectorSection title="Transform" description="Position, size, and rotation.">
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            id={ids.x}
            label="X"
            value={textElement.x ?? 0}
            step={10}
            onChange={(next) => onUpdateText(textElement.id, { x: next })}
          />
          <NumberField
            id={ids.y}
            label="Y"
            value={textElement.y ?? 0}
            step={10}
            onChange={(next) => onUpdateText(textElement.id, { y: next })}
          />
          <NumberField
            id={ids.width}
            label="Width"
            value={textElement.width ?? 0}
            step={10}
            onChange={(next) => onUpdateText(textElement.id, { width: next })}
          />
          <NumberField
            id={ids.height}
            label="Height"
            value={textElement.height ?? 0}
            step={10}
            onChange={(next) => onUpdateText(textElement.id, { height: next })}
          />
          <NumberField
            id={ids.rotation}
            label="Rotation (°)"
            value={textElement.rotation ?? 0}
            step={1}
            onChange={(next) => onUpdateText(textElement.id, { rotation: next })}
          />
          <NumberField
            id={ids.zIndex}
            label="Layer (z-index)"
            value={textElement.zIndex ?? 0}
            step={1}
            onChange={(next) => onUpdateText(textElement.id, { zIndex: next })}
          />
          <NumberField
            id={ids.fontSize}
            label="Font size"
            value={textElement.fontSize ?? 64}
            step={2}
            onChange={(next) => onUpdateText(textElement.id, { fontSize: next })}
          />
        </div>
      </InspectorSection>

      <InspectorSection title="Style" description="Typography and colors.">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor={ids.font} className="text-xs text-white/70">
              Font
            </Label>
            <select
              id={ids.font}
              value={textElement.font || "Inter"}
              onChange={(e) => onUpdateText(textElement.id, { font: e.target.value })}
              className="flex h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0"
            >
              <option value="Inter">Inter</option>
              <option value="Arial">Arial</option>
              <option value="Lato">Lato</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor={ids.align} className="text-xs text-white/70">
              Align
            </Label>
            <select
              id={ids.align}
              value={textElement.align || "left"}
              onChange={(e) =>
                onUpdateText(textElement.id, {
                  align: e.target.value as TextElement["align"],
                })
              }
              className="flex h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor={ids.color} className="text-xs text-white/70">
              Text color
            </Label>
            <input
              id={ids.color}
              type="color"
              value={textColorValue}
              onChange={(e) => onUpdateText(textElement.id, { color: e.target.value })}
              className="h-10 w-full rounded-md border border-white/10 bg-black/30 p-1"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={ids.background} className="text-xs text-white/70">
              Background
            </Label>
            <input
              id={ids.background}
              type="color"
              value={backgroundColorValue}
              onChange={(e) =>
                onUpdateText(textElement.id, { backgroundColor: e.target.value })
              }
              className="h-10 w-full rounded-md border border-white/10 bg-black/30 p-1"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={ids.opacity} className="text-xs text-white/70">
                Opacity
              </Label>
              <div className="text-xs tabular-nums text-white/60">
                {(textElement.opacity ?? 100).toFixed(0)}%
              </div>
            </div>
            <input
              id={ids.opacity}
              type="range"
              min={0}
              max={100}
              step={1}
              value={textElement.opacity ?? 100}
              onChange={(e) =>
                onUpdateText(textElement.id, { opacity: Number(e.target.value) })
              }
              className="w-full accent-white"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={ids.blur} className="text-xs text-white/70">
                Blur
              </Label>
              <div className="text-xs tabular-nums text-white/60">
                {(textElement.blur ?? 0).toFixed(0)}px
              </div>
            </div>
            <input
              id={ids.blur}
              type="range"
              min={0}
              max={20}
              step={1}
              value={textElement.blur ?? 0}
              onChange={(e) => onUpdateText(textElement.id, { blur: Number(e.target.value) })}
              className="w-full accent-white"
            />
          </div>
        </div>
      </InspectorSection>

      <InspectorSection title="Animation" description="Entrance/exit behavior.">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor={ids.animation} className="text-xs text-white/70">
              Preset
            </Label>
            <select
              id={ids.animation}
              value={textElement.animation || "none"}
              onChange={(e) =>
                onUpdateText(textElement.id, {
                  animation: e.target.value as TextElement["animation"],
                })
              }
              className="flex h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0"
            >
              <option value="none">None</option>
              <option value="fade">Fade</option>
              <option value="slide-in">Slide right</option>
              <option value="slide-up">Slide up</option>
              <option value="zoom">Zoom</option>
              <option value="bounce">Bounce</option>
            </select>
          </div>

          <NumberField
            id={ids.fadeIn}
            label="Fade in (s)"
            value={textElement.fadeInDuration ?? 0.4}
            min={0}
            step={0.05}
            onChange={(next) => onUpdateText(textElement.id, { fadeInDuration: next })}
          />
          <NumberField
            id={ids.fadeOut}
            label="Fade out (s)"
            value={textElement.fadeOutDuration ?? 0.4}
            min={0}
            step={0.05}
            onChange={(next) => onUpdateText(textElement.id, { fadeOutDuration: next })}
          />
        </div>
      </InspectorSection>
    </div>
  );
}
