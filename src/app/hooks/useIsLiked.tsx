import { Like } from "../types";

const useIsLiked = (userId: string, postId: string, likes: Like[]) =>
  likes.some((like) => like.user_id === userId && like.post_id === postId);

export default useIsLiked;
