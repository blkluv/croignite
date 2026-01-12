import { ConvexReactClient } from "convex/react";
import { requirePublicEnv } from "@/lib/env/public";

export const convexClient = new ConvexReactClient(
  requirePublicEnv(
    process.env.NEXT_PUBLIC_CONVEX_URL,
    "NEXT_PUBLIC_CONVEX_URL",
  ),
);
