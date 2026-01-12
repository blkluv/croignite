export const SORA_SECONDS = [4, 8, 12] as const;
export type SoraSeconds = (typeof SORA_SECONDS)[number];

export const SORA_SIZES = [
  "720x1280",
  "1280x720",
  "1024x1792",
  "1792x1024",
] as const;
export type SoraSize = (typeof SORA_SIZES)[number];

export const SORA_MODELS = {
  "sora-2": {
    label: "Sora 2",
    sizes: ["720x1280", "1280x720"] as const,
  },
  "sora-2-pro": {
    label: "Sora 2 Pro",
    sizes: ["720x1280", "1280x720", "1024x1792", "1792x1024"] as const,
  },
} as const;

export type SoraModel = keyof typeof SORA_MODELS;

export const SORA_DEFAULTS: Readonly<{
  model: SoraModel;
  seconds: SoraSeconds;
  size: SoraSize;
}> = {
  model: "sora-2",
  seconds: 4,
  size: "720x1280",
};

export function isSoraSizeAllowed(model: SoraModel, size: SoraSize): boolean {
  return (SORA_MODELS[model].sizes as readonly SoraSize[]).includes(size);
}

