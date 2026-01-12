"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { useAppDispatch } from "@/app/store";
import { addSoraJob } from "@/app/store/slices/projectSlice";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import type { SoraJob } from "@/app/types";
import { ensureOpenAIKeyOrRedirect } from "@/features/ai/byok/require-openai-key";
import {
  SORA_DEFAULTS,
  SORA_MODELS,
  SORA_SECONDS,
  type SoraModel,
  type SoraSeconds,
  type SoraSize,
} from "@/features/ai/sora/capabilities";

type Props = {
  onGenerated?: () => void;
  hideHeader?: boolean;
  className?: string;
};

export function SoraPanel({ onGenerated, hideHeader = false, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<SoraModel>(SORA_DEFAULTS.model);
  const [seconds, setSeconds] = useState<SoraSeconds>(SORA_DEFAULTS.seconds);
  const [size, setSize] = useState<SoraSize>(SORA_DEFAULTS.size);

  const allowedSizes = useMemo(() => {
    return SORA_MODELS[model].sizes as readonly SoraSize[];
  }, [model]);

  useEffect(() => {
    if (!allowedSizes.includes(size)) {
      setSize(allowedSizes[0] ?? SORA_DEFAULTS.size);
    }
  }, [allowedSizes, size]);

  const nextPath = useMemo(() => {
    const queryString = searchParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }, [pathname, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const ok = await ensureOpenAIKeyOrRedirect(router.push, nextPath);
      if (!ok) return;
    } catch (error) {
      console.error(error);
      toast.error("Failed to check OpenAI key status.");
      return;
    }

    if (!prompt.trim()) {
      toast.error("Enter a prompt to generate a Sora clip.");
      return;
    }

    const now = new Date().toISOString();
    const job: SoraJob = {
      id: crypto.randomUUID(),
      model,
      prompt: prompt.trim(),
      seconds,
      size,
      status: "queued",
      createdAt: now,
      updatedAt: now,
      message: "Queued.",
    };

    dispatch(addSoraJob(job));
    toast.success("Sora job queued. Track it in History.");
    setPrompt("");
    onGenerated?.();
  };

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border border-white/10 bg-white/5 p-4",
        className,
      )}
    >
      {!hideHeader ? (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Generate with Sora
            </h3>
            <p className="text-sm text-white/60">
              Generate a clip in the background, then review it in History.
            </p>
          </div>
        </div>
      ) : null}
      <form className="space-y-3" onSubmit={handleSubmit}>
        <textarea
          className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          rows={3}
          placeholder="A cyberpunk courier racing through neon streets…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm text-white/80">
            <span className="text-xs text-white/60">Model</span>
            <select
              className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              value={model}
              onChange={(e) => setModel(e.target.value as SoraModel)}
            >
              {Object.entries(SORA_MODELS).map(([id, info]) => (
                <option key={id} value={id} className="text-black">
                  {info.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-white/80">
            <span className="text-xs text-white/60">Duration</span>
            <select
              className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              value={seconds}
              onChange={(e) => setSeconds(Number(e.target.value) as SoraSeconds)}
            >
              {SORA_SECONDS.map((value) => (
                <option key={value} value={value} className="text-black">
                  {value}s
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-white/80">
            <span className="text-xs text-white/60">Size</span>
            <select
              className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              value={size}
              onChange={(e) => setSize(e.target.value as SoraSize)}
            >
              {allowedSizes.map((value) => (
                <option key={value} value={value} className="text-black">
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="submit"
          disabled={false}
          className="w-full rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Generate clip
        </button>
      </form>
      <p className="text-xs text-white/55">
        Tip: You can close this dialog — generation continues and stays visible in
        History.
      </p>
    </div>
  );
}
