import { convexClient } from "@/lib/convex/client";
import { updateProfile } from "@/lib/convex/functions";

const useUpdateProfile = async (
  userId: string,
  name: string,
  username: string | undefined,
  bio: string,
  image?: string,
) => {
  try {
    return await convexClient.mutation(updateProfile, {
      wallet: userId,
      name,
      username,
      bio,
      image,
    });
  } catch (error) {
    throw error;
  }
};

export default useUpdateProfile;
