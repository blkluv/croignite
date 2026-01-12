import { convexClient } from "@/lib/convex/client";
import { listPostsPaginated } from "@/lib/convex/functions";
import type { PostWithProfile } from "@/app/types";

export type PostsPage = {
  page: PostWithProfile[];
  isDone: boolean;
  continueCursor: string | null;
};

type PostsPageOptions = {
  cursor?: string | null;
  limit?: number;
};

const useGetAllPostsPage = async ({
  cursor,
  limit = 6,
}: PostsPageOptions): Promise<PostsPage> => {
  try {
    return (await convexClient.query(listPostsPaginated, {
      paginationOpts: { cursor: cursor ?? null, numItems: limit },
    })) as PostsPage;
  } catch (error) {
    throw error;
  }
};

export default useGetAllPostsPage;
