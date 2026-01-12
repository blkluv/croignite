import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import { Profile } from '../types';
import getProfileByUserId from '../hooks/useGetProfileByUserId';
  
interface ProfileStore {
    currentProfile: Profile | null;
    setCurrentProfile: (userId: string) => void;
}

export const useProfileStore = create<ProfileStore>()( 
    devtools(
        persist(
            (set) => ({
                currentProfile: null,

                setCurrentProfile: async (userId: string) => {
                    const result = await getProfileByUserId(userId)
                    set({ currentProfile: result });
                },
            }),
            { 
                name: 'store', 
                storage: createJSONStorage(() => localStorage) 
            }
        )
    )
)
