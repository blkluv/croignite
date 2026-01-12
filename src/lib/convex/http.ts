import { ConvexHttpClient } from "convex/browser";
import { requireServerEnv } from "@/lib/env/server";

export const convexHttpClient = new ConvexHttpClient(
  requireServerEnv("NEXT_PUBLIC_CONVEX_URL"),
);
