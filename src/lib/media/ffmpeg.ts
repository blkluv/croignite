"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";

const loadTimeoutMs = 180000;

export async function createLoadedFfmpeg(options?: {
  onLog?: (message: string) => void;
}) {
  if (typeof window === "undefined") {
    throw new Error("FFmpeg can only be loaded in the browser.");
  }

  const ffmpeg = new FFmpeg();

  if (options?.onLog) {
    ffmpeg.on("log", ({ message }) => {
      options.onLog?.(message);
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), loadTimeoutMs);

  try {
    const coreURL = new URL("/ffmpeg/ffmpeg-core.js", window.location.origin);
    const wasmURL = new URL("/ffmpeg/ffmpeg-core.wasm", window.location.origin);
    const classWorkerURL = new URL(
      "/ffmpeg/class-worker/worker.js",
      window.location.origin,
    );

    await ffmpeg.load(
      {
        classWorkerURL: classWorkerURL.toString(),
        coreURL: coreURL.toString(),
        wasmURL: wasmURL.toString(),
      },
      { signal: controller.signal },
    );

    return ffmpeg;
  } catch (error) {
    try {
      ffmpeg.terminate();
    } catch {
      // ignore
    }

    const message = error instanceof Error ? error.message : "Unknown error.";
    throw new Error(`Failed to load FFmpeg. ${message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}
