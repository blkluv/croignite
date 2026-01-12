import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import { RandomUsers } from '../types';
import getRandomUsers from '../hooks/useGetRandomUsers';
  
interface GeneralStore {
    isEditProfileOpen: boolean
    isFeedMuted: boolean
    feedVolume: number
    lastFeedVolume: number
    isAutoScrollEnabled: boolean
    randomUsers: RandomUsers[]
    setIsEditProfileOpen: (val: boolean) => void
    setIsFeedMuted: (val: boolean) => void
    setFeedVolume: (val: number) => void
    setIsAutoScrollEnabled: (val: boolean) => void
    setRandomUsers: () => void,
}

const clampVolume = (value: number) => Math.max(0, Math.min(1, value))

export const useGeneralStore = create<GeneralStore>()( 
    devtools(
        persist(
            (set) => ({
                isEditProfileOpen: false,
                isFeedMuted: false,
                feedVolume: 0.75,
                lastFeedVolume: 0.75,
                isAutoScrollEnabled: false,
                randomUsers: [],

                setIsEditProfileOpen: (val: boolean) => set({ isEditProfileOpen: val }),
                setIsFeedMuted: (val: boolean) =>
                    set((state) => {
                        if (val) {
                            return { isFeedMuted: true, feedVolume: 0 }
                        }
                        const nextVolume = state.lastFeedVolume || 0.75
                        return { isFeedMuted: false, feedVolume: nextVolume }
                    }),
                setFeedVolume: (val: number) =>
                    set((state) => {
                        const nextVolume = clampVolume(val)
                        return {
                            feedVolume: nextVolume,
                            lastFeedVolume: nextVolume > 0 ? nextVolume : state.lastFeedVolume,
                            isFeedMuted: nextVolume === 0,
                        }
                    }),
                setIsAutoScrollEnabled: (val: boolean) => set({ isAutoScrollEnabled: val }),
                setRandomUsers: async () => {
                    const result = await getRandomUsers()
                    set({ randomUsers: result })
                },
            }),
            { 
                name: 'store', 
                storage: createJSONStorage(() => localStorage),
                onRehydrateStorage: () => (state) => {
                    if (!state) return
                    const nextVolume = clampVolume(state.lastFeedVolume || 0.75)
                    state.setFeedVolume(nextVolume)
                    state.setIsFeedMuted(false)
                },
            }
        )
    )
)
