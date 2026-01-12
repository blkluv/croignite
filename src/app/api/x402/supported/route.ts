import { NextResponse } from "next/server";
import { X402_FACILITATOR_BASE_URL } from "@/lib/x402/constants";

export const runtime = "nodejs";

export async function GET() {
  const response = await fetch(`${X402_FACILITATOR_BASE_URL}/v2/x402/supported`, {
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));

  return NextResponse.json(payload, { status: response.status });
}
