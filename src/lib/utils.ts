import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.replace("/", "").trim();
      return id || null;
    }

    if (parsed.hostname.endsWith("youtube.com")) {
      const watchId = parsed.searchParams.get("v");
      if (watchId) return watchId;

      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" && parts[1]) return parts[1];
      if (parts[0] === "shorts" && parts[1]) return parts[1];
    }

    return null;
  } catch {
    return null;
  }
}

export function getCanvaDesignUrl(
  url: string,
  options: { embed?: boolean } = {},
): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (hostname !== "www.canva.com" && hostname !== "canva.com") return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    const designIndex = parts.indexOf("design");
    if (designIndex === -1) return null;

    const designId = parts[designIndex + 1];
    if (!designId) return null;

    const maybeKey = parts[designIndex + 2];
    const hasKey = Boolean(maybeKey && maybeKey !== "view" && maybeKey !== "edit");
    const designKey = hasKey ? maybeKey : null;

    const viewUrl = new URL("https://www.canva.com");
    viewUrl.pathname = designKey
      ? `/design/${designId}/${designKey}/view`
      : `/design/${designId}/view`;

    if (options.embed) {
      viewUrl.search = "?embed";
    }

    return viewUrl.toString();
  } catch {
    return null;
  }
}

export function stableJsonStringify(value: unknown) {
  const seen = new WeakSet<object>();

  const normalize = (input: unknown): unknown => {
    if (input === null || typeof input !== "object") return input;
    if (input instanceof Date) return input.toISOString();

    if (seen.has(input)) {
      throw new TypeError("Cannot stable stringify circular structure");
    }
    seen.add(input);

    if (Array.isArray(input)) {
      return input.map((item) => normalize(item));
    }

    const record = input as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      const v = record[key];
      if (typeof v === "undefined") continue;
      out[key] = normalize(v);
    }
    return out;
  };

  return JSON.stringify(normalize(value));
}

export function ipfsUriToGatewayUrl(
  ipfsUri: string,
  gatewayBase = "https://gateway.pinata.cloud/ipfs/",
) {
  if (!ipfsUri) return ipfsUri;
  if (ipfsUri.startsWith("http://") || ipfsUri.startsWith("https://")) {
    return ipfsUri;
  }
  if (!ipfsUri.startsWith("ipfs://")) return ipfsUri;
  const path = ipfsUri.slice("ipfs://".length).replace(/^ipfs\//, "");
  return `${gatewayBase}${path}`;
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatShortHash(value: string, visibleStart = 6, visibleEnd = 4) {
  if (!value) return value;
  const minLength = visibleStart + visibleEnd + 2;
  if (value.length <= minLength) return value;
  return `${value.slice(0, visibleStart)}...${value.slice(-visibleEnd)}`;
}

export async function copyToClipboard(value: string) {
  if (!value || typeof navigator === "undefined") return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    if (typeof document === "undefined") return false;
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const didCopy = document.execCommand("copy");
    document.body.removeChild(textarea);
    return didCopy;
  } catch {
    return false;
  }
}
