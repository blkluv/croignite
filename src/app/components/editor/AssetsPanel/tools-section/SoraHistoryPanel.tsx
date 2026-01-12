"use client";

import { useMemo } from "react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "@/app/store";
import {
  addSoraJob,
  clearSoraJobs,
  deleteSoraJob,
  setActiveElement,
  setActiveElementIndex,
  setCurrentTime,
  setIsPlaying,
} from "@/app/store/slices/projectSlice";
import type { SoraJob } from "@/app/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  isSoraSizeAllowed,
  SORA_DEFAULTS,
  SORA_MODELS,
  type SoraModel,
  type SoraSize,
} from "@/features/ai/sora/capabilities";
import {
  CheckCircle2,
  Loader2,
  RotateCcw,
  Trash2,
  TriangleAlert,
} from "lucide-react";

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function SoraHistoryPanel() {
  const dispatch = useAppDispatch();
  const { soraJobs, mediaFiles } = useAppSelector((state) => state.projectState);

  const jobs = useMemo(() => soraJobs ?? [], [soraJobs]);
  const modelLabel = (job: SoraJob) => {
    const size = job.size as SoraSize;
    const inferredModel: SoraModel =
      (job.model as SoraModel | undefined) ??
      (isSoraSizeAllowed(SORA_DEFAULTS.model, size) ? SORA_DEFAULTS.model : "sora-2-pro");

    return SORA_MODELS[inferredModel].label;
  };

  const statusTone = (job: SoraJob) => {
    switch (job.status) {
      case "completed":
        return "border-[color:var(--brand-success)] bg-[color:var(--brand-success-soft)] text-[color:var(--brand-success)]";
      case "failed":
        return "border-[color:var(--brand-accent)] bg-[color:var(--brand-accent-soft)] text-[color:var(--brand-accent-strong)]";
      case "downloading":
      case "polling":
      case "creating":
      case "queued":
      default:
        return "border-white/10 bg-white/5 text-white/80";
    }
  };

  const statusLabel = (job: SoraJob) => {
    switch (job.status) {
      case "queued":
        return "Queued";
      case "creating":
        return "Creating";
      case "polling":
        return "Rendering";
      case "downloading":
        return "Saving";
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      default:
        return job.status;
    }
  };

  const statusIcon = (job: SoraJob) => {
    switch (job.status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
      case "failed":
        return <TriangleAlert className="h-4 w-4" aria-hidden="true" />;
      case "creating":
      case "polling":
      case "downloading":
      case "queued":
      default:
        return <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold text-white">Generation history</h3>
          <p className="text-xs text-white/55">
            Track renders even after you close the Generate dialog.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={jobs.length === 0}
          onClick={() => dispatch(clearSoraJobs())}
        >
          Clear
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-white/70">No generations yet.</p>
          <p className="mt-1 text-xs text-white/50">
            Start one from <span className="font-medium text-white">Generate</span>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className={cn("rounded-xl border p-4", statusTone(job))}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold">
                      {statusIcon(job)}
                      {statusLabel(job)}
                    </span>
                    <span className="text-xs text-white/50">
                      {formatTimestamp(job.createdAt)}
                    </span>
                  </div>
                  <div
                    className="text-sm font-medium text-white/90"
                    title={job.prompt}
                  >
                    {job.prompt || "Untitled prompt"}
                  </div>
                  <div className="text-xs text-white/55">
                    {modelLabel(job)} • {job.seconds}s • {job.size}
                    {job.message ? (
                      <>
                        {" "}
                        • <span className="text-white/60">{job.message}</span>
                      </>
                    ) : null}
                  </div>
                  {job.status === "failed" && job.error ? (
                    <div className="text-xs text-[color:var(--brand-accent-strong)]">
                      {job.error}
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {job.status === "failed" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const now = new Date().toISOString();
                        const retry: SoraJob = {
                          id: crypto.randomUUID(),
                          prompt: job.prompt,
                          seconds: job.seconds,
                          size: job.size,
                          model: job.model,
                          status: "queued",
                          createdAt: now,
                          updatedAt: now,
                          message: "Queued.",
                        };
                        dispatch(addSoraJob(retry));
                        toast.success("Retry queued.");
                      }}
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Retry
                    </Button>
                  ) : null}

                  {job.status === "completed" && job.mediaId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const index = mediaFiles.findIndex((m) => m.id === job.mediaId);
                        if (index < 0) {
                          toast.error("Clip not found in this project.");
                          return;
                        }
                        dispatch(setIsPlaying(false));
                        dispatch(setCurrentTime(mediaFiles[index].positionStart));
                        dispatch(setActiveElement("media"));
                        dispatch(setActiveElementIndex(index));
                      }}
                    >
                      Reveal
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-full bg-black/30 text-white/70 hover:bg-black/50 hover:text-white"
                    onClick={() => dispatch(deleteSoraJob(job.id))}
                    aria-label="Remove from history"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
