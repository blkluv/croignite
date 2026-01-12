"use client";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { useEffect, useRef, useState } from "react";
import { getFile, storeFile, useAppDispatch, useAppSelector } from "@/app/store";
import { Save } from "lucide-react";
import { extractConfigs } from "@/app/utils/extractConfigs";
import { mimeToExt } from "@/app/types";
import { toast } from "react-hot-toast";
import FfmpegProgressBar from "./ProgressBar";
import { renderWithDiffusionCore } from "@/lib/media/core-render";
import { addExport } from "@/app/store/slices/projectSlice";

interface FileUploaderProps {
  loadFunction: () => Promise<void>;
  loadFfmpeg: boolean;
  loadError?: string | null;
  ffmpeg: FFmpeg;
  logMessages: string;
}
export default function FfmpegRender({
  loadFunction,
  loadFfmpeg,
  loadError,
  ffmpeg,
  logMessages,
  }: FileUploaderProps) {
    const dispatch = useAppDispatch();
    const { mediaFiles, projectName, exportSettings, duration, textElements, tracks } =
      useAppSelector((state) => state.projectState);
  const totalDuration = duration;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [gpuProgress, setGpuProgress] = useState<number | null>(null);
  const engine = exportSettings.renderEngine ?? "ffmpeg";

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (loaded && videoRef.current && previewUrl) {
      videoRef.current.src = previewUrl;
    }
  }, [loaded, previewUrl]);

  const handleCloseModal = async () => {
    setShowModal(false);
    setIsRendering(false);
    try {
      ffmpeg.terminate();
      await loadFunction();
    } catch (e) {
      console.error("Failed to reset FFmpeg:", e);
    }
  };

  const render = async () => {
    if (mediaFiles.length === 0 && textElements.length === 0) {
      console.log("No media files to render");
      return;
    }
    setShowModal(true);
    setIsRendering(true);
    setGpuProgress(null);

    const renderFunction = async (): Promise<Blob> => {
      const params = extractConfigs(exportSettings);

	      if (engine === "gpu") {
	        const blob = await renderWithDiffusionCore({
	          mediaFiles,
	          textElements,
	          tracks,
	          exportSettings,
	          onProgress: (p) => {
	            const total = p.total ?? 0;
	            const progress = p.progress ?? 0;
	            const percent = total > 0 ? (progress / total) * 100 : 0;
	            setGpuProgress(percent);
	          },
	        });
	        return blob;
	      }

      try {
        const filters: string[] = [];
        const inputs: string[] = [];
        const audioDelays: string[] = [];

        const loadFontForMeasurement = async (options: {
	          fontFamily: string;
	          fontSize: number;
	        }) => {
	          if (typeof document === "undefined") return;
	          const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
	          if (!fonts?.load) return;
	          try {
	            await fonts.load(`${options.fontSize}px "${options.fontFamily}"`);
	          } catch {
	            // best effort
          }
        };

        const getTextMeasurer = (() => {
          let ctx: CanvasRenderingContext2D | null = null;
          const cache = new Map<string, (value: string) => number>();
          return (options: { fontFamily: string; fontSize: number }) => {
            const key = `${options.fontFamily}::${options.fontSize}`;
            const cached = cache.get(key);
            if (cached) return cached;

            if (!ctx && typeof document !== "undefined") {
              ctx = document.createElement("canvas").getContext("2d");
            }

            const measure = (value: string) => {
              if (!ctx) return value.length * options.fontSize * 0.6;
              ctx.font = `${options.fontSize}px "${options.fontFamily}"`;
              return ctx.measureText(value).width;
            };

            cache.set(key, measure);
            return measure;
          };
        })();

        const getLineHeightPx = (() => {
          const cache = new Map<string, number>();
          return (options: { fontFamily: string; fontSize: number }) => {
            const key = `${options.fontFamily}::${options.fontSize}`;
            const cached = cache.get(key);
            if (typeof cached === "number") return cached;
            if (typeof document === "undefined") return Math.round(options.fontSize * 1.2);

            const span = document.createElement("span");
            span.textContent = "Hg";
            span.style.position = "fixed";
            span.style.left = "-9999px";
            span.style.top = "0";
            span.style.whiteSpace = "pre";
            span.style.fontFamily = `"${options.fontFamily}"`;
            span.style.fontSize = `${options.fontSize}px`;
            document.body.appendChild(span);

            try {
              const rect = span.getBoundingClientRect();
              const height = rect.height;
              const lineHeight =
                typeof height === "number" && Number.isFinite(height) && height > 0
                  ? height
                  : options.fontSize * 1.2;
              cache.set(key, lineHeight);
              return lineHeight;
            } finally {
              span.remove();
            }
          };
        })();

        const wrapTextToLines = (value: string, options: {
          fontFamily: string;
          fontSize: number;
          maxWidth: number;
        }) => {
          const input = (value ?? "").replace(/\r\n/g, "\n");
          const maxWidth = Number.isFinite(options.maxWidth)
            ? Math.max(1, options.maxWidth)
            : 1;
          const measure = getTextMeasurer({
            fontFamily: options.fontFamily,
            fontSize: options.fontSize,
          });

          const lines: string[] = [];
          const paragraphs = input.split("\n");

          const pushLine = (line: string) => {
            lines.push(line);
          };

          const breakLongToken = (token: string) => {
            let remaining = token;
            while (remaining.length > 0) {
              let slice = "";
              for (const ch of remaining) {
                const next = slice + ch;
                if (slice.length > 0 && measure(next) > maxWidth) break;
                slice = next;
              }
              if (slice.length === 0) {
                slice = remaining.slice(0, 1);
              }
              pushLine(slice);
              remaining = remaining.slice(slice.length);
            }
          };

          for (const paragraph of paragraphs) {
            if (paragraph.length === 0) {
              pushLine("");
              continue;
            }

            const tokens = paragraph.split(/(\s+)/);
            let current = "";

            for (const token of tokens) {
              if (token.length === 0) continue;

              const candidate = current + token;
              if (current.length === 0) {
                if (measure(token) <= maxWidth) {
                  current = token;
                } else {
                  breakLongToken(token);
                }
                continue;
              }

              if (measure(candidate) <= maxWidth) {
                current = candidate;
                continue;
              }

              pushLine(current.trimEnd());
              const nextToken = token.trimStart();
              if (nextToken.length === 0) {
                current = "";
                continue;
              }
              if (measure(nextToken) <= maxWidth) {
                current = nextToken;
              } else {
                breakLongToken(nextToken);
                current = "";
              }
            }

            if (current.length > 0) {
              pushLine(current.trimEnd());
            }
          }

          if (lines.length === 0) return [""];
          return lines;
        };

        type OverlayEntry = {
          label: string;
          x: number;
          y: number;
          baseWidth: number;
          baseHeight: number;
          start: number;
          end: number;
          effectiveZ: number;
          kind: "media" | "text";
          order: number;
          animation?: string;
          fadeIn: number;
        };

        const overlays: OverlayEntry[] = [];

        const clampNumber = (value: number, min: number, max: number) =>
          Math.min(Math.max(value, min), max);

        const safeNumber = (value: unknown, fallback: number) =>
          typeof value === "number" && Number.isFinite(value) ? value : fallback;

        const safeInt = (value: unknown, fallback: number) =>
          Math.max(1, Math.round(safeNumber(value, fallback)));

        const parseHexColor = (value: unknown, fallbackHex: string) => {
          if (typeof value !== "string") return { hex: fallbackHex, alpha: 1 };
          const raw = value.trim();
          if (raw.length === 0 || raw === "transparent") {
            return { hex: "#000000", alpha: 0 };
          }
          const match = raw.match(/^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/);
          if (!match) return { hex: fallbackHex, alpha: 1 };
          const hex = `#${match[1]}`;
          const alpha = match[2] ? parseInt(match[2], 16) / 255 : 1;
          return { hex, alpha: clampNumber(alpha, 0, 1) };
        };

        const escapeDrawtext = (value: string) =>
          value
            .replace(/\\/g, "\\\\")
            .replace(/:/g, "\\:")
            .replace(/'/g, "\\\\'");

        const trackIndexById = new Map(
          (tracks ?? []).map((t, idx) => [t.id, idx] as const),
        );
        const trackIndex = (trackId?: string) =>
          trackId ? trackIndexById.get(trackId) ?? 0 : 0;
        const effectiveZ = (trackId?: string, zIndex?: number) =>
          trackIndex(trackId) * 1000 + (zIndex ?? 0);

        // Create base black background
        filters.push(
          `color=c=black:size=1920x1080:d=${totalDuration.toFixed(3)}[base]`,
        );
        for (let i = 0; i < mediaFiles.length; i++) {
          const clip = mediaFiles[i];
          const { startTime, positionStart, positionEnd } = clip;
          const clipDuration = Math.max(0, positionEnd - positionStart);
          if (clipDuration <= 0) continue;

          const fileData = await getFile(clip.fileId);
          if (!fileData) {
            throw new Error(`Missing file for clip ${clip.fileName}`);
          }
          const buffer = await fileData.arrayBuffer();
          const ext =
            mimeToExt[fileData.type as keyof typeof mimeToExt] ||
            fileData.type.split("/")[1];
          await ffmpeg.writeFile(`input${i}.${ext}`, new Uint8Array(buffer));

          if (clip.type === "image") {
            inputs.push(
              "-loop",
              "1",
              "-t",
              clipDuration.toFixed(3),
              "-i",
              `input${i}.${ext}`,
            );
          } else {
            inputs.push("-i", `input${i}.${ext}`);
          }

          const audioLabel = `audio${i}`;
          const isVisual = clip.type === "video" || clip.type === "image";
          if (isVisual) {
            const visualLabel = `visual${i}`;
            const sourceWidth = safeInt(clip.width, 1920);
            const sourceHeight = safeInt(clip.height, 1080);
            const crop = clip.crop ?? {
              x: 0,
              y: 0,
              width: sourceWidth,
              height: sourceHeight,
            };
            const cropWidth = clampNumber(
              safeInt(crop.width, sourceWidth),
              1,
              sourceWidth,
            );
            const cropHeight = clampNumber(
              safeInt(crop.height, sourceHeight),
              1,
              sourceHeight,
            );
            const cropX = clampNumber(
              Math.round(safeNumber(crop.x, 0)),
              0,
              sourceWidth - cropWidth,
            );
            const cropY = clampNumber(
              Math.round(safeNumber(crop.y, 0)),
              0,
              sourceHeight - cropHeight,
            );

            const alpha = clampNumber((clip.opacity ?? 100) / 100, 0, 1);
            const blur = clampNumber(safeNumber(clip.blur, 0), 0, 60);
            const rotationDeg = safeNumber(clip.rotation, 0);
            const rotationRad =
              rotationDeg !== 0 ? (rotationDeg * Math.PI) / 180 : 0;

            const blurFilter = blur > 0 ? `,gblur=sigma=${blur}:steps=2` : "";
            const rotateFilter =
              rotationRad !== 0
                ? `,rotate=${rotationRad}:ow=rotw(${rotationRad}):oh=roth(${rotationRad}):c=black@0`
                : "";

            if (clip.type === "video") {
              filters.push(
                `[${i}:v]trim=start=${startTime.toFixed(3)}:duration=${clipDuration.toFixed(3)},setpts=PTS-STARTPTS+${positionStart.toFixed(3)}/TB,scale=${sourceWidth}:${sourceHeight}${blurFilter},crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}${rotateFilter},format=yuva420p,colorchannelmixer=aa=${alpha}[${visualLabel}]`,
              );
            } else {
              filters.push(
                `[${i}:v]scale=${sourceWidth}:${sourceHeight}${blurFilter},crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}${rotateFilter},format=yuva420p,colorchannelmixer=aa=${alpha},setpts=PTS+${positionStart.toFixed(3)}/TB[${visualLabel}]`,
              );
            }

            overlays.push({
              label: visualLabel,
              x: Math.round(safeNumber(clip.x, 0)),
              y: Math.round(safeNumber(clip.y, 0)),
              baseWidth: cropWidth,
              baseHeight: cropHeight,
              start: positionStart,
              end: positionEnd,
              effectiveZ: effectiveZ(clip.trackId, clip.zIndex),
              kind: "media",
              order: i,
              fadeIn: 0,
            });
          }

          if (clip.type === "audio" || clip.type === "video") {
            const delayMs = Math.round(positionStart * 1000);
            const volume =
              clip.volume !== undefined ? clip.volume / 100 : 1;
            filters.push(
              `[${i}:a]atrim=start=${startTime.toFixed(3)}:duration=${clipDuration.toFixed(3)},asetpts=PTS-STARTPTS,adelay=${delayMs}|${delayMs},volume=${volume}[${audioLabel}]`,
            );
            audioDelays.push(`[${audioLabel}]`);
          }
        }

        if (textElements.length > 0) {
          const supportedFonts = new Set(["Arial", "Inter", "Lato"]);
          const resolveFont = (value: unknown) => {
            const raw = typeof value === "string" ? value.trim() : "";
            return supportedFonts.has(raw) ? raw : "Inter";
          };

          const fontsToLoad = Array.from(
            new Set(textElements.map((t) => resolveFont(t.font))),
          );

          for (const font of fontsToLoad) {
            const res = await fetch(`/fonts/${font}.ttf`);
            if (!res.ok) {
              throw new Error(`Missing font file: /fonts/${font}.ttf`);
            }
            const fontBuf = await res.arrayBuffer();
            await ffmpeg.writeFile(`font${font}.ttf`, new Uint8Array(fontBuf));
          }

          for (let i = 0; i < textElements.length; i++) {
            const text = textElements[i];
            const baseWidth = safeInt(text.width, 800);
            const baseHeight = safeInt(text.height, 200);
            const x = Math.round(safeNumber(text.x, 0));
            const y = Math.round(safeNumber(text.y, 0));

            const opacity = clampNumber((text.opacity ?? 100) / 100, 0, 1);
            const blur = clampNumber(safeNumber(text.blur, 0), 0, 60);
            const rotationDeg = safeNumber(text.rotation, 0);
            const rotationRad =
              rotationDeg !== 0 ? (rotationDeg * Math.PI) / 180 : 0;

            const fadeIn = clampNumber(safeNumber(text.fadeInDuration, 0.4), 0, 60);
            const fadeOut = clampNumber(safeNumber(text.fadeOutDuration, 0.4), 0, 60);

            const { hex: textHex } = parseHexColor(text.color, "#ffffff");
            const bg = parseHexColor(text.backgroundColor, "#000000");
            const bgColor =
              bg.alpha > 0 ? `${bg.hex}@${bg.alpha.toFixed(3)}` : "black@0";

            const srcLabel = `textsrc${i}`;
            const drawLabel = `textdraw${i}`;
            const fxLabel = `textfx${i}`;
            const outLabel = `textvis${i}`;

            filters.push(
              `color=c=${bgColor}:size=${baseWidth}x${baseHeight}:d=${totalDuration.toFixed(3)},format=rgba[${srcLabel}]`,
            );

            const font = (() => {
              const raw = typeof text.font === "string" ? text.font.trim() : "";
              return raw === "Arial" || raw === "Inter" || raw === "Lato" ? raw : "Inter";
            })();

            const fontSizePx = Math.max(1, Math.round(safeNumber(text.fontSize, 24)));
            await loadFontForMeasurement({ fontFamily: font, fontSize: fontSizePx });

            const align = text.align || "left";
            const xExpr =
              align === "center"
                ? "(w-text_w)/2"
                : align === "right"
                  ? "(w-text_w)"
                  : "0";

            const wrappedLines = wrapTextToLines(text.text ?? "", {
              fontFamily: font,
              fontSize: fontSizePx,
              maxWidth: baseWidth,
            });
            const lineHeight = getLineHeightPx({
              fontFamily: font,
              fontSize: fontSizePx,
            });

            let drawCurrent = srcLabel;
            let drewText = false;
            for (let lineIndex = 0; lineIndex < wrappedLines.length; lineIndex++) {
              const rawLine = wrappedLines[lineIndex] ?? "";
              const escapedLine = escapeDrawtext(rawLine);
              if (escapedLine.trim().length === 0) continue;

              const nextLabel =
                lineIndex === wrappedLines.length - 1
                  ? drawLabel
                  : `${drawLabel}_${lineIndex}`;
              const yPx = Math.max(0, Math.round(lineIndex * lineHeight));

              filters.push(
                `[${drawCurrent}]drawtext=fontfile=font${font}.ttf:text='${escapedLine}':x=${xExpr}:y=${yPx}:fontsize=${fontSizePx}:fontcolor=${textHex}[${nextLabel}]`,
              );
              drawCurrent = nextLabel;
              drewText = true;
            }

            if (!drewText) {
              filters.push(`[${srcLabel}]null[${drawLabel}]`);
            } else if (drawCurrent !== drawLabel) {
              filters.push(`[${drawCurrent}]null[${drawLabel}]`);
            }

            let current = drawLabel;

            if (blur > 0) {
              filters.push(`[${current}]gblur=sigma=${blur}:steps=2[${fxLabel}]`);
              current = fxLabel;
            }

            const animation = text.animation || "none";
            if (fadeIn > 0 && (animation === "zoom" || animation === "bounce")) {
              const progress = `min(max((t-${text.positionStart.toFixed(3)})/${fadeIn.toFixed(3)}\\,0)\\,1)`;
              const scaleExpr =
                animation === "zoom"
                  ? `0.9+0.1*${progress}`
                  : `1-0.2*cos(${progress}*PI/2)`;
              const scaled = `textscale${i}`;
              filters.push(
                `[${current}]scale=w='iw*(${scaleExpr})':h='ih*(${scaleExpr})':eval=frame[${scaled}]`,
              );
              current = scaled;
            }

            if (rotationRad !== 0) {
              const rotated = `textrot${i}`;
              filters.push(
                `[${current}]rotate=${rotationRad}:ow=rotw(${rotationRad}):oh=roth(${rotationRad}):c=black@0[${rotated}]`,
              );
              current = rotated;
            }

            const withAlpha = `textalpha${i}`;
            filters.push(
              `[${current}]format=yuva420p,colorchannelmixer=aa=${opacity}[${withAlpha}]`,
            );
            current = withAlpha;

            if (fadeIn > 0) {
              const fadedIn = `textfadein${i}`;
              filters.push(
                `[${current}]fade=t=in:st=${text.positionStart.toFixed(3)}:d=${fadeIn.toFixed(3)}:alpha=1[${fadedIn}]`,
              );
              current = fadedIn;
            }
            if (fadeOut > 0) {
              const fadeOutStart = Math.max(
                text.positionStart,
                text.positionEnd - fadeOut,
              );
              const fadedOut = `textfadeout${i}`;
              filters.push(
                `[${current}]fade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeOut.toFixed(3)}:alpha=1[${fadedOut}]`,
              );
              current = fadedOut;
            }

            filters.push(`[${current}]null[${outLabel}]`);

            overlays.push({
              label: outLabel,
              x,
              y,
              baseWidth,
              baseHeight,
              start: text.positionStart,
              end: text.positionEnd,
              effectiveZ: effectiveZ(text.trackId, text.zIndex),
              kind: "text",
              order: i,
              animation: text.animation || "none",
              fadeIn,
            });
          }
        }

        overlays.sort((a, b) => {
          if (a.effectiveZ !== b.effectiveZ) return a.effectiveZ - b.effectiveZ;
          if (a.kind !== b.kind) return a.kind === "media" ? -1 : 1;
          return a.order - b.order;
        });

        let lastLabel = "base";
        if (overlays.length === 0) {
          filters.push("[base]null[outv]");
        } else {
          for (let i = 0; i < overlays.length; i++) {
            const ov = overlays[i];
            const nextLabel = i === overlays.length - 1 ? "outv" : `tmp${i}`;
            const baseX = `${ov.x} + (${ov.baseWidth} - w)/2`;
            const baseY = `${ov.y} + (${ov.baseHeight} - h)/2`;

            const slide =
              ov.kind === "text" &&
              (ov.animation === "slide-in" || ov.animation === "slide-up") &&
              ov.fadeIn > 0;
            const yExpr = slide
              ? `${baseY} + (30*(1-min(max((t-${ov.start.toFixed(3)})/${ov.fadeIn.toFixed(3)}\\,0)\\,1)))`
              : baseY;

            filters.push(
              `[${lastLabel}][${ov.label}]overlay=x='${baseX}':y='${yExpr}':enable='between(t\\,${ov.start.toFixed(3)}\\,${ov.end.toFixed(3)})'[${nextLabel}]`,
            );
            lastLabel = nextLabel;
          }
        }

        // Mix all audio tracks
        if (audioDelays.length > 0) {
          const audioMix = audioDelays.join("");
          filters.push(
            `${audioMix}amix=inputs=${audioDelays.length}:normalize=0[outa]`,
          );
        }

        // Final filter_complex
        const complexFilter = filters.join("; ");
        const ffmpegArgs = [
          ...inputs,
          "-filter_complex",
          complexFilter,
          "-map",
          "[outv]",
        ];

        if (audioDelays.length > 0) {
          ffmpegArgs.push("-map", "[outa]");
        }

        ffmpegArgs.push(
          "-c:v",
          "libx264",
          "-c:a",
          "aac",
          "-preset",
          params.preset,
          "-crf",
          params.crf.toString(),
          "-t",
          totalDuration.toFixed(3),
          "output.mp4",
        );

        await ffmpeg.exec(ffmpegArgs);
      } catch (err) {
        console.error("FFmpeg processing error:", err);
      }

      // return the output url
      const outputData = await ffmpeg.readFile("output.mp4");
      if (typeof outputData === "string") {
        throw new Error("FFmpeg returned a string for output.mp4");
      }

      const outputBytes = outputData;
      let outputBuffer: ArrayBuffer;

      if (outputBytes.buffer instanceof ArrayBuffer) {
        outputBuffer =
          outputBytes.byteOffset === 0 &&
          outputBytes.byteLength === outputBytes.buffer.byteLength
            ? outputBytes.buffer
            : outputBytes.buffer.slice(
                outputBytes.byteOffset,
                outputBytes.byteOffset + outputBytes.byteLength,
              );
      } else {
        outputBuffer = new ArrayBuffer(outputBytes.byteLength);
        new Uint8Array(outputBuffer).set(outputBytes);
      }

      const outputBlob = new Blob([outputBuffer], {
        type: "video/mp4",
      });
      return outputBlob;
    };

    // Run the function and handle the result/error
    try {
      const outputBlob = await renderFunction();
      const now = new Date();
      const safeProjectName = (projectName || "cliplore-export")
        .trim()
        .replace(/[^\w\-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/(^-|-$)/g, "");
      const exportFile = new File(
        [outputBlob],
        `${safeProjectName || "cliplore-export"}-${now.toISOString().replace(/[:.]/g, "")}.mp4`,
        { type: "video/mp4" },
      );
      const exportFileId = crypto.randomUUID();
      const stored = await storeFile(exportFile, exportFileId);
      if (!stored) {
        throw new Error("Failed to store export file.");
      }

      const nextPreviewUrl = URL.createObjectURL(exportFile);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(nextPreviewUrl);
      setLoaded(true);
      setIsRendering(false);

      const exportId = crypto.randomUUID();
      dispatch(
        addExport({
          id: exportId,
          fileId: exportFileId,
          name: exportFile.name,
          createdAt: now.toISOString(),
          durationSeconds: totalDuration,
          fileSizeBytes: exportFile.size,
          config: JSON.parse(JSON.stringify(exportSettings)),
        }),
      );

      toast.success("Export saved to your project.");
    } catch (err) {
      toast.error("Failed to render video");
      console.error("Failed to render video:", err);
    }
  };

  return (
    <>
      {/* Render Button */}
      <button
        onClick={() => render()}
        className={`inline-flex items-center p-3 bg-white hover:bg-[#ccc] rounded-lg disabled:opacity-50 text-gray-900 font-bold transition-all transform`}
        disabled={
          (engine !== "gpu" && !loadFfmpeg) ||
          isRendering ||
          (mediaFiles.length === 0 && textElements.length === 0)
        }
      >
        {(((engine !== "gpu" && !loadFfmpeg) && !loadError) || isRendering) && (
          <span className="animate-spin mr-2">
            <svg
              viewBox="0 0 1024 1024"
              focusable="false"
              data-icon="loading"
              width="1em"
              height="1em"
            >
              <path d="M988 548c-19.9 0-36-16.1-36-36 0-59.4-11.6-117-34.6-171.3a440.45 440.45 0 00-94.3-139.9 437.71 437.71 0 00-139.9-94.3C629 83.6 571.4 72 512 72c-19.9 0-36-16.1-36-36s16.1-36 36-36c69.1 0 136.2 13.5 199.3 40.3C772.3 66 827 103 874 150c47 47 83.9 101.8 109.7 162.7 26.7 63.1 40.2 130.2 40.2 199.3.1 19.9-16 36-35.9 36z"></path>
            </svg>
          </span>
        )}
        <p>
          {engine === "gpu"
            ? isRendering
              ? "Rendering (GPU)..."
              : "Render (GPU)"
            : loadFfmpeg
              ? isRendering
                ? "Rendering..."
                : "Render"
              : loadError
                ? "FFmpeg failed to load"
                : "Loading FFmpeg..."}
        </p>
      </button>
      {!loadFfmpeg && loadError ? (
        <div className="mt-3 text-center text-xs text-destructive">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={loadFunction}
            className="mt-2 text-xs font-semibold text-white underline underline-offset-4"
          >
            Retry loading FFmpeg
          </button>
        </div>
      ) : null}

      {/* Render Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-black rounded-xl shadow-lg p-6 max-w-xl w-full">
            {/* Title and close button */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {isRendering ? "Rendering..." : `${projectName}`}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-white text-4xl font-bold hover:text-[color:var(--brand-accent-strong)]"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {isRendering ? (
              engine === "gpu" ? (
                <div className="bg-black p-2 h-40 text-sm font-mono rounded flex flex-col gap-3">
                  <div>GPU rendering with Diffusion Core…</div>
                  <div className="w-full bg-gray-700 h-2 rounded">
                    <div
                      className="bg-white h-2 rounded"
                      style={{ width: `${gpuProgress ?? 0}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400">
                    {gpuProgress !== null
                      ? `${gpuProgress.toFixed(1)}%`
                      : "Starting…"}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-black p-2 h-40 text-sm font-mono rounded">
                    <div>{logMessages}</div>
                    <p className="text-xs text-gray-400 italic">
                      The progress bar is experimental in FFmpeg WASM, so it
                      might appear slow or unresponsive even though the actual
                      processing is not.
                    </p>
                    <FfmpegProgressBar ffmpeg={ffmpeg} />
                  </div>
                </div>
              )
	            ) : (
	              <div>
	                {previewUrl && (
	                  <video src={previewUrl} controls className="w-full mb-4" />
	                )}
                <div className="flex flex-wrap justify-between gap-3">
                  <a
                    href={previewUrl || "#"}
                    download={`${projectName}.mp4`}
                    className={`inline-flex items-center p-3 bg-white hover:bg-[#ccc] rounded-lg text-gray-900 font-bold transition-all transform `}
                  >
                    <Save size={18} />
                    <span className="ml-2">Save Video</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
