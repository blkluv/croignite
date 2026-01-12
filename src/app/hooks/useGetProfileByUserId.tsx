import { convexClient } from "@/lib/convex/client";
import { getProfile } from "@/lib/convex/functions";
import type { Profile } from "@/app/types";

const useGetProfileByUserId = async (
  userId: string,
): Promise<Profile | null> => {
  try {
    const profile = (await convexClient.query(getProfile, {
      wallet: userId,
    })) as {
      _id: string;
      wallet: string;
      name: string;
      username?: string;
      image: string;
      bio: string;
    } | null;

    if (!profile) return null;

    return {
      id: profile._id,
      user_id: profile.wallet,
      name: profile.name,
      username: profile.username,
      image: profile.image,
      bio: profile.bio,
    };
  } catch (error) {
    throw error;
  }
};

export default useGetProfileByUserId;
