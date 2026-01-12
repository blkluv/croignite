import "server-only";

import {
  SORA_DEFAULTS,
  type SoraModel,
  type SoraSeconds,
  type SoraSize,
} from "@/features/ai/sora/capabilities";

const OPENAI_API_BASE = "https://api.openai.com/v1";

type SoraSecondsString = `${SoraSeconds}`;

function toSoraSecondsString(seconds: SoraSeconds): SoraSecondsString {
  return `${seconds}` as SoraSecondsString;
}

type OpenAIAuth = { apiKey: string };

async function openaiFetch(apiKey: string, path: string, init: RequestInit) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${apiKey}`);

  return fetch(`${OPENAI_API_BASE}${path}`, { ...init, headers });
}

async function openaiJson<T>(apiKey: string, path: string, init: RequestInit) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  const res = await openaiFetch(apiKey, path, { ...init, headers });

  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(
      new Error(`OpenAI request failed: ${res.status} ${text}`),
      { status: res.status },
    );
  }

  return res.json() as Promise<T>;
}

export type SoraJob = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  error?: string;
};

export async function createSoraJob(params: {
  model?: SoraModel;
  prompt: string;
  seconds?: SoraSeconds;
  size?: SoraSize;
}, auth: OpenAIAuth) {
  const job = await openaiJson<{ id: string }>(auth.apiKey, "/videos", {
    method: "POST",
    body: JSON.stringify({
      model: params.model ?? SORA_DEFAULTS.model,
      prompt: params.prompt,
      seconds: toSoraSecondsString(params.seconds ?? SORA_DEFAULTS.seconds),
      size: params.size ?? SORA_DEFAULTS.size,
    }),
  });

  return job.id;
}

export async function getSoraJob(
  jobId: string,
  auth: OpenAIAuth,
): Promise<SoraJob> {
  const job = await openaiJson<{
    id: string;
    status: string;
    error?: { message?: string } | string;
  }>(auth.apiKey, `/videos/${encodeURIComponent(jobId)}`, { method: "GET" });

  const rawStatus = job.status.toLowerCase();
  const errorMessage =
    typeof job.error === "string"
      ? job.error
      : job.error?.message ?? undefined;

  if (
    rawStatus === "completed" ||
    rawStatus === "succeeded" ||
    rawStatus === "success"
  ) {
    return { id: job.id, status: "completed" };
  }

  if (
    rawStatus === "failed" ||
    rawStatus === "error" ||
    rawStatus === "cancelled" ||
    rawStatus === "canceled"
  ) {
    return { id: job.id, status: "failed", error: errorMessage };
  }

  if (rawStatus === "queued" || rawStatus === "pending") {
    return { id: job.id, status: "queued" };
  }

  return { id: job.id, status: "processing" };
}

export async function getSoraContentResponse(jobId: string, auth: OpenAIAuth) {
  const res = await openaiFetch(auth.apiKey, `/videos/${encodeURIComponent(jobId)}/content`, {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`OpenAI content failed: ${res.status} ${text}`), {
      status: res.status,
    });
  }

  return res;
}
