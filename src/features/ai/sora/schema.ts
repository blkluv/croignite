import { z } from "zod";
import {
  isSoraSizeAllowed,
  SORA_DEFAULTS,
  SORA_MODELS,
  SORA_SIZES,
  type SoraModel,
  type SoraSeconds,
  type SoraSize,
} from "@/features/ai/sora/capabilities";

const secondsSchema: z.ZodType<SoraSeconds, z.ZodTypeDef, unknown> = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return value;
  },
  z.union([z.literal(4), z.literal(8), z.literal(12)]),
);

const modelSchema: z.ZodType<SoraModel> = z.enum(
  Object.keys(SORA_MODELS) as [SoraModel, ...SoraModel[]],
);

const sizeSchema: z.ZodType<SoraSize> = z.enum(SORA_SIZES);

const createRequestBaseSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(32000),
  model: modelSchema.optional(),
  seconds: secondsSchema.optional(),
  size: sizeSchema.optional(),
});

export const soraCreateRequestSchema = createRequestBaseSchema
  .transform((value) => {
    const size = value.size ?? SORA_DEFAULTS.size;
    const seconds = value.seconds ?? SORA_DEFAULTS.seconds;
    const model =
      value.model ??
      (isSoraSizeAllowed(SORA_DEFAULTS.model, size) ? SORA_DEFAULTS.model : "sora-2-pro");

    return { prompt: value.prompt, model, seconds, size };
  })
  .superRefine((value, ctx) => {
    if (!isSoraSizeAllowed(value.model, value.size)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["size"],
        message: `${value.size} requires ${SORA_MODELS["sora-2-pro"].label}.`,
      });
    }
  });

export type SoraCreateRequest = z.infer<typeof soraCreateRequestSchema>;

export const soraCreateRequestInputSchema = createRequestBaseSchema;

export type SoraCreateRequestInput = z.infer<typeof soraCreateRequestInputSchema>;
