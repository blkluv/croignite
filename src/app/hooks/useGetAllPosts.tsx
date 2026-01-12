import { convexClient } from "@/lib/convex/client";
import { listPosts } from "@/lib/convex/functions";
import type { PostWithProfile } from "@/app/types";

const useGetAllPosts = async (): Promise<PostWithProfile[]> => {
  try {
    return (await convexClient.query(listPosts, {})) as PostWithProfile[];
  } catch (error) {
    throw error;
  }
};

export default useGetAllPosts;
