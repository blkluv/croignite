"use client";

import { useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { storeFile, useAppDispatch, useAppSelector } from "@/app/store";
import {
  applyTimelineEdit,
  setActiveElement,
  setActiveElementIndex,
  setCurrentTime,
  setIsPlaying,
  updateSoraJob,
} from "@/app/store/slices/projectSlice";
import { createMediaFileFromFile } from "@/lib/media/ingest";
import { SORA_DEFAULTS } from "@/features/ai/sora/capabilities";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function SoraJobManager() {
  const dispatch = useAppDispatch();
  const projectState = useAppSelector((state) => state.projectState);
  const {
    soraJobs,
    filesID = [],
    mediaFiles,
    textElements,
    tracks,
    resolution,
    historyLockDepth,
    fps,
  } = projectState;

  const stateRef = useRef({
    soraJobs,
    filesID,
    mediaFiles,
    textElements,
    tracks,
    resolution,
    historyLockDepth,
    fps,
  });

  useEffect(() => {
    stateRef.current = {
      soraJobs,
      filesID,
      mediaFiles,
      textElements,
      tracks,
      resolution,
      historyLockDepth,
      fps,
    };
  }, [
    filesID,
    fps,
    historyLockDepth,
    mediaFiles,
    resolution,
    soraJobs,
    textElements,
    tracks,
  ]);

  const runnableJobIds = useMemo(() => {
    return (soraJobs ?? [])
      .filter((job) => job.status !== "completed" && job.status !== "failed")
      .map((job) => job.id);
  }, [soraJobs]);

  const runningRef = useRef(new Set<string>());

  useEffect(() => {
    for (const id of runnableJobIds) {
      if (runningRef.current.has(id)) continue;
      runningRef.current.add(id);
      void (async () => {
        try {
          await runJob(id);
        } finally {
          runningRef.current.delete(id);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runnableJobIds]);

  const waitForHistoryUnlock = async () => {
    for (let i = 0; i < 40; i++) {
      if ((stateRef.current.historyLockDepth ?? 0) <= 0) return;
      await sleep(150);
    }
  };

  const runJob = async (id: string) => {
    const getJob = () =>
      (stateRef.current.soraJobs ?? []).find((job) => job.id === id) ?? null;

    let job = getJob();
    if (!job) return;

    const now = () => new Date().toISOString();

    const ensureJobId = async (): Promise<string> => {
      const existing = getJob();
      if (existing?.jobId) return existing.jobId;

      dispatch(
        updateSoraJob({
          id,
          status: "creating",
          message: "Creating Sora job…",
          error: null,
          updatedAt: now(),
        }),
      );

      const res = await fetch("/api/sora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: job?.prompt ?? "",
          seconds: job?.seconds ?? SORA_DEFAULTS.seconds,
          size: job?.size ?? SORA_DEFAULTS.size,
          ...(job?.model ? { model: job.model } : {}),
        }),
      });

      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) {
        throw new Error(data.error ?? "Failed to start Sora job");
      }

      dispatch(
        updateSoraJob({
          id,
          jobId: data.jobId,
          status: "polling",
          message: "Waiting for render…",
          error: null,
          updatedAt: now(),
        }),
      );

      return data.jobId;
    };

    const pollUntilCompleted = async (jobId: string): Promise<string> => {
      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        const res = await fetch(`/api/sora?jobId=${encodeURIComponent(jobId)}`);
        const data = (await res.json()) as {
          status?: string;
          error?: string;
          contentUrl?: string | null;
        };

        if (!res.ok) {
          throw new Error(data.error ?? "Failed to fetch Sora job status");
        }

        if (data.status === "completed") {
          const url = data.contentUrl ?? `/api/sora/content?jobId=${jobId}`;
          dispatch(
            updateSoraJob({
              id,
              status: "downloading",
              message: "Downloading clip…",
              contentUrl: url,
              updatedAt: now(),
            }),
          );
          return url;
        }

        if (data.status === "failed") {
          throw new Error(data.error ?? "Sora job failed");
        }

        dispatch(
          updateSoraJob({
            id,
            status: "polling",
            message: "Rendering…",
            updatedAt: now(),
          }),
        );

        await sleep(POLL_INTERVAL_MS);
      }

      throw new Error("Sora job timed out");
    };

    const download = async (url: string): Promise<{ file: File; fileId: string }> => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to download Sora clip");
      }
      const blob = await res.blob();
      const file = new File([blob], `sora-${Date.now()}.mp4`, {
        type: blob.type || "video/mp4",
      });
      const fileId = crypto.randomUUID();
      const stored = await storeFile(file, fileId);
      if (!stored) throw new Error("Failed to save clip to library");
      return { file, fileId };
    };

    const addClipToTimeline = async (file: File, fileId: string) => {
      await waitForHistoryUnlock();

      const { mediaFiles: currentMedia, filesID: currentFiles, tracks: currentTracks } =
        stateRef.current;
      const mainTrackId = currentTracks[0]?.id ?? null;
      if (!mainTrackId) throw new Error("No timeline layer available");

      const existingOnTrack = currentMedia.filter(
        (clip) => (clip.trackId ?? null) === mainTrackId,
      );
      const lastEnd =
        existingOnTrack.length > 0
          ? Math.max(...existingOnTrack.map((clip) => clip.positionEnd))
          : 0;

      const src = URL.createObjectURL(file);
      const clip = await createMediaFileFromFile({
        file,
        fileId,
        src,
        positionStart: lastEnd,
        frame: {
          width: resolution?.width ?? 1920,
          height: resolution?.height ?? 1080,
        },
        trackId: mainTrackId ?? undefined,
        defaultDurationSeconds: 30,
      });

      const nextFilesID = currentFiles.includes(fileId)
        ? currentFiles
        : [...currentFiles, fileId];
      const nextMedia = [...currentMedia, clip];

      dispatch(
        applyTimelineEdit({
          filesID: nextFilesID,
          mediaFiles: nextMedia,
          textElements: stateRef.current.textElements,
        }),
      );

      dispatch(setIsPlaying(false));
      dispatch(setCurrentTime(clip.positionStart));
      dispatch(setActiveElement("media"));
      const index = nextMedia.findIndex((m) => m.id === clip.id);
      if (index >= 0) dispatch(setActiveElementIndex(index));

      dispatch(
        updateSoraJob({
          id,
          status: "completed",
          message: "Added to library and timeline.",
          fileId,
          mediaId: clip.id,
          error: null,
          updatedAt: now(),
        }),
      );
    };

    try {
      job = getJob();
      if (!job) return;

      if (job.status === "queued") {
        dispatch(
          updateSoraJob({
            id,
            status: "creating",
            message: "Creating Sora job…",
            error: null,
            updatedAt: now(),
          }),
        );
      }

      const jobId = await ensureJobId();
      const contentUrl = await pollUntilCompleted(jobId);
      const { file, fileId } = await download(contentUrl);
      dispatch(
        updateSoraJob({
          id,
          status: "downloading",
          message: "Adding to project…",
          fileId,
          updatedAt: now(),
        }),
      );

      await addClipToTimeline(file, fileId);
      toast.success("Sora clip ready.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sora generation failed";
      dispatch(
        updateSoraJob({
          id,
          status: "failed",
          error: message,
          message: "Generation failed.",
          updatedAt: new Date().toISOString(),
        }),
      );
      toast.error(message);
    }
  };

  return null;
}
