"use client";

import { useEffect, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { createLoadedFfmpeg } from "@/lib/media/ffmpeg";
import FfmpegRender from "./FfmpegRender";
import RenderOptions from "./RenderOptions";
export default function Ffmpeg() {
  const [loadFfmpeg, setLoadedFfmpeg] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const ffmpegRef = useRef<FFmpeg>(new FFmpeg());
  const [logMessages, setLogMessages] = useState<string>("");

  const loadFFmpegFunction = async () => {
    setLoadedFfmpeg(false);
    setLoadError(null);
    try {
      setLogMessages("");
      const ffmpeg = await createLoadedFfmpeg({
        onLog: (message) => setLogMessages(message),
      });
      ffmpegRef.current = ffmpeg;
      setLoadedFfmpeg(true);
    } catch (error) {
      console.error("Failed to load FFmpeg:", error);
      setLoadError(
        error instanceof Error ? error.message : "Failed to load FFmpeg.",
      );
    }
  };

  useEffect(() => {
    loadFFmpegFunction();
  }, []);

  return (
    <div className="flex flex-col justify-center items-center py-2">
      <RenderOptions />
      {!loadFfmpeg && !loadError ? (
        <p className="mt-2 text-xs text-white/60">Loading FFmpeg…</p>
      ) : null}
      <FfmpegRender
        loadFunction={loadFFmpegFunction}
        loadFfmpeg={loadFfmpeg}
        loadError={loadError}
        logMessages={logMessages}
        ffmpeg={ffmpegRef.current}
      />
    </div>
  );
}
