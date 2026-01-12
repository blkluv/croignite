"use client";

import { getFile } from "@/app/store";
import type {
  ExportConfig,
  MediaFile,
  TextElement,
  TimelineTrack,
} from "@/app/types";
import { clientEnv } from "@/lib/env/client";

type DiffusionCore = typeof import("@diffusionstudio/core");
type DiffusionHex = `#${string}`;
type EncoderProgressPayload = {
  total: number;
  progress: number;
  remaining: Date;
};
type EncoderProgressHandler = (progress: EncoderProgressPayload) => void;
type DiffusionLayer = import("@diffusionstudio/core").Layer;
type DiffusionFont = import("@diffusionstudio/core").Font;
type DiffusionEffect = import("@diffusionstudio/core").Effect;
type DiffusionVideoSource = import("@diffusionstudio/core").VideoSource;
type DiffusionImageSource = import("@diffusionstudio/core").ImageSource;
type DiffusionAudioSource = import("@diffusionstudio/core").AudioSource;
type KeyframeOptions<K, T> = import("@diffusionstudio/core").KeyframeOptions<K, T>;
type RectangleClipAnimationOptions =
  import("@diffusionstudio/core").RectangleClipAnimationOptions;
type TextClipAnimationOptions =
  import("@diffusionstudio/core").TextClipAnimationOptions;
type TransformAnimation =
  | KeyframeOptions<"translateY", number>
  | KeyframeOptions<"scale", number>;

let cachedCore: DiffusionCore | null = null;

const loadCore = async () => {
  if (!cachedCore) {
    cachedCore = await import("@diffusionstudio/core");
  }
  return cachedCore;
};

type CoreRenderInput = {
  mediaFiles: MediaFile[];
  textElements: TextElement[];
  tracks: TimelineTrack[];
  exportSettings: ExportConfig;
  onProgress?: EncoderProgressHandler;
};

const resolutionToSize = (resolution: string) => {
  switch (resolution) {
    case "480p":
      return { width: 854, height: 480 };
    case "720p":
      return { width: 1280, height: 720 };
    case "1080p":
      return { width: 1920, height: 1080 };
    case "2K":
      return { width: 2048, height: 1080 };
    case "4K":
      return { width: 3840, height: 2160 };
    default:
      return { width: 1920, height: 1080 };
  }
};

const qualityToBitrates = (quality: string) => {
  switch (quality) {
    case "low":
      return { video: 2e6, audio: 128e3 };
    case "medium":
      return { video: 4e6, audio: 192e3 };
    case "high":
      return { video: 8e6, audio: 256e3 };
    case "ultra":
      return { video: 16e6, audio: 320e3 };
    default:
      return { video: 4e6, audio: 192e3 };
  }
};

const normalizeOpacity = (opacity?: number) =>
  Math.min(Math.max((opacity ?? 100) / 100, 0), 1);

const normalizeVolume = (volume?: number) =>
  Math.min(Math.max((volume ?? 100) / 100, 0), 1);

const toHexColor = (input?: string): DiffusionHex => {
  if (!input) return "#ffffff";
  if (input.startsWith("#")) return input.slice(0, 7) as DiffusionHex;
  const lowered = input.toLowerCase();
  if (lowered === "white") return "#ffffff";
  if (lowered === "black") return "#000000";
  return "#ffffff";
};

const parseHexWithAlpha = (input?: string) => {
  if (!input) return { hex: "#000000" as DiffusionHex, alpha: 0 };
  const raw = input.trim();
  if (raw.length === 0 || raw === "transparent") {
    return { hex: "#000000" as DiffusionHex, alpha: 0 };
  }
  const match = raw.match(/^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/);
  if (!match) {
    return { hex: toHexColor(raw) as DiffusionHex, alpha: 1 };
  }
  const hex = `#${match[1]}` as DiffusionHex;
  const alpha = match[2] ? parseInt(match[2], 16) / 255 : 1;
  return { hex, alpha: Math.min(Math.max(alpha, 0), 1) };
};

export async function renderWithDiffusionCore({
  mediaFiles,
  textElements,
  tracks,
  exportSettings,
  onProgress,
}: CoreRenderInput): Promise<Blob> {
  if (typeof window === "undefined") {
    throw new Error(
      "Diffusion Core rendering is only supported in the browser.",
    );
  }

  const core = await loadCore();
  const { width, height } = resolutionToSize(exportSettings.resolution);
  const bitrates = qualityToBitrates(exportSettings.quality);

  const composition = new core.Composition({
    width,
    height,
    background: "#000000",
    licenseKey: clientEnv.NEXT_PUBLIC_DIFFUSION_LICENSE_KEY ?? null,
  });

  const mountEl = document.createElement("div");
  mountEl.style.position = "fixed";
  mountEl.style.left = "-9999px";
  mountEl.style.top = "0";
  mountEl.style.width = "0";
  mountEl.style.height = "0";
  document.body.appendChild(mountEl);
  composition.mount(mountEl);

  try {
    const clampNumber = (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), max);

    const safeNumber = (value: unknown, fallback: number) =>
      typeof value === "number" && Number.isFinite(value) ? value : fallback;

    const safeDuration = (start: number, end: number) => Math.max(0, end - start);

    const trackIndexById = new Map(
      (tracks ?? []).map((t, idx) => [t.id, idx] as const),
    );
    const trackIndex = (trackId?: string) =>
      trackId ? trackIndexById.get(trackId) ?? 0 : 0;
    const effectiveZ = (trackId?: string, zIndex?: number) =>
      trackIndex(trackId) * 1000 + (zIndex ?? 0);

    const visualMediaFiles = mediaFiles.filter(
      (m) => m.type === "video" || m.type === "image",
    );
    const audioFiles = mediaFiles.filter((m) => m.type === "audio");

    type VisualGroup = {
      media: MediaFile[];
      text: TextElement[];
    };

    const groups = new Map<number, VisualGroup>();
    const ensureGroup = (z: number) => {
      const existing = groups.get(z);
      if (existing) return existing;
      const next: VisualGroup = { media: [], text: [] };
      groups.set(z, next);
      return next;
    };

    for (const clip of visualMediaFiles) {
      ensureGroup(effectiveZ(clip.trackId, clip.zIndex)).media.push(clip);
    }
    for (const clip of textElements) {
      ensureGroup(effectiveZ(clip.trackId, clip.zIndex)).text.push(clip);
    }

    const zOrder = Array.from(groups.keys()).sort((a, b) => b - a);
    const layersByZ = new Map<number, DiffusionLayer>();
    for (const z of zOrder) {
      const layer = new core.Layer();
      await composition.add(layer, composition.layers.length);
      layersByZ.set(z, layer);
    }

    const uniqueFonts = Array.from(
      new Set(textElements.map((t) => (t.font || "Inter").trim()).filter(Boolean)),
    );
    const fontsByFamily = new Map<string, DiffusionFont>();
    for (const family of uniqueFonts) {
      try {
        const font = await core.loadFont({
          family,
          source: `url(/fonts/${family}.ttf)`,
        });
        fontsByFamily.set(family, font);
      } catch {
        // Fallback to system fonts if custom font fails to load.
      }
    }

    const buildFadeAnimation = (options: {
      start: number;
      end: number;
      fadeIn: number;
      fadeOut: number;
      finalOpacity: number;
    }): KeyframeOptions<"opacity", number> => {
      const duration = Math.max(0, options.end - options.start);
      const fadeIn = clampNumber(options.fadeIn, 0, duration);
      const fadeOut = clampNumber(options.fadeOut, 0, duration);
      const fadeInEnd = options.start + fadeIn;
      const fadeOutStart = Math.max(fadeInEnd, options.end - fadeOut);
      const finalOpacity = clampNumber(options.finalOpacity, 0, 1);

      return {
        key: "opacity" as const,
        extrapolate: "clamp" as const,
        frames: [
          { time: options.start, value: 0 },
          { time: fadeInEnd, value: finalOpacity, easing: "ease-out" as const },
          { time: fadeOutStart, value: finalOpacity },
          { time: options.end, value: 0, easing: "ease-in" as const },
        ],
      };
    };

    const buildTransformAnimations = (options: {
      start: number;
      fadeIn: number;
      animation?: TextElement["animation"];
    }): TransformAnimation[] => {
      const fadeIn = Math.max(0, options.fadeIn);
      const fadeInEnd = options.start + fadeIn;
      const animation = options.animation || "none";

      const animations: TransformAnimation[] = [];

      if ((animation === "slide-in" || animation === "slide-up") && fadeIn > 0) {
        animations.push({
          key: "translateY",
          extrapolate: "clamp" as const,
          frames: [
            { time: options.start, value: 30 },
            { time: fadeInEnd, value: 0, easing: "ease-out" as const },
          ],
        });
      }

      if ((animation === "zoom" || animation === "bounce") && fadeIn > 0) {
        const startScale = animation === "zoom" ? 0.9 : 0.8;
        const frames =
          animation === "bounce"
            ? [
                { time: options.start, value: startScale },
                {
                  time: options.start + fadeIn * 0.7,
                  value: 1.05,
                  easing: "ease-out" as const,
                },
                { time: fadeInEnd, value: 1, easing: "ease-in-out" as const },
              ]
            : [
                { time: options.start, value: startScale },
                { time: fadeInEnd, value: 1, easing: "ease-out" as const },
              ];

        animations.push({
          key: "scale",
          extrapolate: "clamp" as const,
          frames,
        });
      }

      return animations;
    };

    for (const z of zOrder) {
      const layer = layersByZ.get(z);
      const group = groups.get(z);
      if (!layer || !group) continue;

      for (const file of group.media) {
        const fileData = await getFile(file.fileId);
        if (!fileData) continue;

        const duration = safeDuration(file.positionStart, file.positionEnd);
        if (duration <= 0) continue;

        const effects: DiffusionEffect[] =
          file.blur && file.blur > 0 ? [{ type: "blur", value: file.blur }] : [];

        const widthPx = safeNumber(file.width, composition.width);
        const heightPx = safeNumber(file.height, composition.height);
        const crop = file.crop ?? {
          x: 0,
          y: 0,
          width: widthPx,
          height: heightPx,
        };

        const cropWidth = clampNumber(safeNumber(crop.width, widthPx), 1, widthPx);
        const cropHeight = clampNumber(
          safeNumber(crop.height, heightPx),
          1,
          heightPx,
        );
        const cropX = clampNumber(
          safeNumber(crop.x, 0),
          0,
          Math.max(0, widthPx - cropWidth),
        );
        const cropY = clampNumber(
          safeNumber(crop.y, 0),
          0,
          Math.max(0, heightPx - cropHeight),
        );

        const mask = new core.RectangleMask({
          x: cropX,
          y: cropY,
          width: cropWidth,
          height: cropHeight,
        });

        const commonProps = {
          delay: file.positionStart,
          duration,
          x: (file.x ?? 0) - cropX,
          y: (file.y ?? 0) - cropY,
          width: widthPx,
          height: heightPx,
          rotation: file.rotation ?? 0,
          opacity: normalizeOpacity(file.opacity),
          effects,
          mask,
        };

        if (file.type === "video") {
          const source = (await core.Source.from(fileData)) as DiffusionVideoSource;
          const rangeEnd = safeNumber(file.endTime, file.startTime + duration);
          const clip = new core.VideoClip(source, {
            ...commonProps,
            range: [file.startTime, rangeEnd] as [number, number],
            volume: normalizeVolume(file.volume),
          });
          await layer.add(clip);
        } else if (file.type === "image") {
          const source = (await core.Source.from(fileData)) as DiffusionImageSource;
          const clip = new core.ImageClip(source, commonProps);
          await layer.add(clip);
        }
      }

      for (const text of group.text) {
        const duration = safeDuration(text.positionStart, text.positionEnd);
        if (duration <= 0) continue;

        const fadeIn = clampNumber(safeNumber(text.fadeInDuration, 0.4), 0, duration);
        const fadeOut = clampNumber(safeNumber(text.fadeOutDuration, 0.4), 0, duration);
        const baseOpacity = normalizeOpacity(text.opacity);
        const rotation = text.rotation ?? 0;
        const effects: DiffusionEffect[] =
          text.blur && text.blur > 0 ? [{ type: "blur", value: text.blur }] : [];

        const boxWidth = safeNumber(text.width, 800);
        const boxHeight = safeNumber(text.height, 200);

        const transformAnimations = buildTransformAnimations({
          start: text.positionStart,
          fadeIn,
          animation: text.animation,
        });

        const bg = parseHexWithAlpha(text.backgroundColor);
        const bgOpacity = clampNumber(baseOpacity * bg.alpha, 0, 1);
        if (bgOpacity > 0 && boxWidth > 0 && boxHeight > 0) {
          const rectAnimations: RectangleClipAnimationOptions = [
            buildFadeAnimation({
              start: text.positionStart,
              end: text.positionEnd,
              fadeIn,
              fadeOut,
              finalOpacity: bgOpacity,
            }),
            ...transformAnimations,
          ];
          const rect = new core.RectangleClip({
            fill: bg.hex,
            delay: text.positionStart,
            duration,
            x: text.x,
            y: text.y,
            width: boxWidth,
            height: boxHeight,
            rotation,
            opacity: bgOpacity,
            effects,
            animations: rectAnimations,
          });
          await layer.add(rect);
        }

        const content = (text.text ?? "").trim();
        if (content.length === 0) continue;

        const family = (text.font || "Inter").trim();
        const loadedFont = fontsByFamily.get(family);
        const fontSize = text.fontSize || loadedFont?.size || 24;

        const textAnimations: TextClipAnimationOptions = [
          buildFadeAnimation({
            start: text.positionStart,
            end: text.positionEnd,
            fadeIn,
            fadeOut,
            finalOpacity: baseOpacity,
          }),
          ...transformAnimations,
        ];

        const clip = new core.TextClip({
          text: text.text,
          delay: text.positionStart,
          duration,
          x: text.x,
          y: text.y,
          rotation,
          opacity: baseOpacity,
          color: toHexColor(text.color),
          font: {
            family,
            size: fontSize,
            weight: loadedFont?.weight,
            style: loadedFont?.style,
          },
          maxWidth: boxWidth > 0 ? boxWidth : undefined,
          align: text.align,
          effects,
          animations: textAnimations,
        });

        await layer.add(clip);
      }
    }

    if (audioFiles.length > 0) {
      const audioLayer = new core.Layer();
      await composition.add(audioLayer, composition.layers.length);

      for (const file of audioFiles) {
        const fileData = await getFile(file.fileId);
        if (!fileData) continue;
        const duration = safeDuration(file.positionStart, file.positionEnd);
        if (duration <= 0) continue;

        const source = (await core.Source.from(fileData)) as DiffusionAudioSource;
        const rangeEnd = safeNumber(file.endTime, file.startTime + duration);
        const clip = new core.AudioClip(source, {
          delay: file.positionStart,
          duration,
          range: [file.startTime, rangeEnd] as [number, number],
          volume: normalizeVolume(file.volume),
        });
        await audioLayer.add(clip);
      }
    }

    const encoder = new core.Encoder(composition, {
      format: "mp4",
      video: {
        codec: "avc",
        fps: exportSettings.fps,
        bitrate: bitrates.video,
      },
      audio: {
        codec: "aac",
        bitrate: bitrates.audio,
      },
    });

    if (onProgress) {
      encoder.onProgress = onProgress;
    }

    const result = await encoder.render();
    if (result.type !== "success" || !result.data) {
      throw new Error("GPU render failed or was canceled.");
    }

    return result.data;
  } finally {
    composition.unmount();
    mountEl.remove();
  }
}
