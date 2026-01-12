import { convexClient } from "@/lib/convex/client";
import { listPostsByUser } from "@/lib/convex/functions";
import type { Post, PostWithProfile } from "@/app/types";

const useGetPostsByUserId = async (userId: string): Promise<Post[]> => {
  try {
    const posts = (await convexClient.query(listPostsByUser, {
      userId,
    })) as PostWithProfile[];

    return posts.map((post) => ({
      id: post.id,
      user_id: post.user_id,
      video_url: post.video_url,
      text: post.text,
      created_at: post.created_at,
    }));
  } catch (error) {
    throw error;
  }
};

export default useGetPostsByUserId;
