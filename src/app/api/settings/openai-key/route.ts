import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearOpenAIKeyCookie,
  hasOpenAIKeyCookie,
  setOpenAIKeyCookie,
} from "@/lib/openai/byok-cookie";

export const runtime = "nodejs";

const bodySchema = z.object({
  apiKey: z.string().trim().min(1),
});

export async function GET() {
  return NextResponse.json({ hasKey: await hasOpenAIKeyCookie() });
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body. Expected { apiKey: string }." },
      { status: 400 },
    );
  }

  const apiKey = parsed.data.apiKey.trim();

  if (!apiKey.startsWith("sk-")) {
    return NextResponse.json(
      {
        error:
          "That doesn't look like an OpenAI API key. Expected it to start with \"sk-\".",
      },
      { status: 400 },
    );
  }

  try {
    const res = NextResponse.json({ ok: true });
    setOpenAIKeyCookie(res, apiKey);
    return res;
  } catch (error) {
    console.error(error);
    const message =
      process.env.NODE_ENV === "production"
        ? "AI key storage is not configured on this server."
        : error instanceof Error
          ? error.message
          : "Failed to save key.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearOpenAIKeyCookie(res);
  return res;
}
