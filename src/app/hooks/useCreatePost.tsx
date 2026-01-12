import { convexClient } from "@/lib/convex/client";
import { createPost, generatePostUploadUrl } from "@/lib/convex/functions";

const useCreatePost = async (file: File, userId: string, text: string) => {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error("Caption is required.");
  }

  const uploadUrl = await convexClient.mutation(generatePostUploadUrl, {});
  const contentType = file.type || "video/mp4";
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Failed to upload video.");
  }

  const { storageId } = (await uploadRes.json()) as { storageId: string };
  if (!storageId) {
    throw new Error("Upload did not return a storage id.");
  }

  return await convexClient.mutation(createPost, {
    userId,
    storageId,
    text: trimmedText,
  });
};

export default useCreatePost;
