import { convexClient } from "@/lib/convex/client";
import { createProject } from "@/lib/convex/functions";

export async function createConvexProject(options: {
  wallet: string;
  title: string;
  localId: string;
}) {
  return await convexClient.mutation(createProject, {
    wallet: options.wallet,
    title: options.title,
    localId: options.localId,
  });
}
