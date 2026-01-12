"use client"

import Link from "next/link"
import Image from "next/image"
import PostUser from "@/app/components/profile/PostUser"
import MainLayout from "@/app/layouts/MainLayout"
import { use, useEffect, useState } from "react"
import { BsPencil } from "react-icons/bs"
import { AiOutlineCopy } from "react-icons/ai"
import { useUser } from "@/app/context/user"
import ClientOnly from "@/app/components/ClientOnly"
import { ProfilePageTypes, PostWithProfile } from "@/app/types"
import { usePostStore } from "@/app/stores/post"
import { useProfileStore } from "@/app/stores/profile"
import { useGeneralStore } from "@/app/stores/general"
import createBucketUrl from "@/app/hooks/useCreateBucketUrl"
import getFollowerCount from "@/app/hooks/useGetFollowerCount"
import getFollowingCount from "@/app/hooks/useGetFollowingCount"
import getLikedPostsByUserId from "@/app/hooks/useGetLikedPostsByUserId"
import getIsFollowing from "@/app/hooks/useIsFollowing"
import toggleFollow from "@/app/hooks/useToggleFollow"
import { toast } from "react-hot-toast"
import { copyToClipboard, formatShortHash } from "@/lib/utils"

export default function Profile({ params }: ProfilePageTypes) {
    const contextUser = useUser()
    const { postsByUser, setPostsByUser } = usePostStore()
    const { setCurrentProfile, currentProfile } = useProfileStore()
    const { isEditProfileOpen, setIsEditProfileOpen } = useGeneralStore()
    const { id } = use(params)
    const [followerCount, setFollowerCount] = useState(0)
    const [followingCount, setFollowingCount] = useState(0)
    const [isFollowing, setIsFollowing] = useState(false)
    const [isFollowLoading, setIsFollowLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<"videos" | "liked">("videos")
    const [likedPosts, setLikedPosts] = useState<PostWithProfile[]>([])
    const [likedStatus, setLikedStatus] = useState<"idle" | "loading">("idle")
    const [isCopying, setIsCopying] = useState(false)
    const displayName = currentProfile?.name || ""
    const handle = currentProfile?.username || formatShortHash(id)

    useEffect(() => {
        setCurrentProfile(id)
        setPostsByUser(id)
    }, [id, setCurrentProfile, setPostsByUser])

    useEffect(() => {
        let isMounted = true

        const loadCounts = async () => {
            try {
                const [followers, following] = await Promise.all([
                    getFollowerCount(id),
                    getFollowingCount(id),
                ])
                if (!isMounted) return
                setFollowerCount(followers)
                setFollowingCount(following)
            } catch {
                if (!isMounted) return
                setFollowerCount(0)
                setFollowingCount(0)
            }
        }

        loadCounts()

        return () => {
            isMounted = false
        }
    }, [id])

    useEffect(() => {
        let isMounted = true

        const loadFollowingState = async () => {
            if (!contextUser?.user?.id || contextUser.user.id === id) {
                setIsFollowing(false)
                return
            }
            try {
                const result = await getIsFollowing(contextUser.user.id, id)
                if (!isMounted) return
                setIsFollowing(result)
            } catch {
                if (!isMounted) return
                setIsFollowing(false)
            }
        }

        loadFollowingState()

        return () => {
            isMounted = false
        }
    }, [contextUser?.user?.id, id])

    useEffect(() => {
        if (activeTab !== "liked") return

        let isMounted = true
        setLikedStatus("loading")

        const loadLiked = async () => {
            try {
                const results = await getLikedPostsByUserId(id)
                if (!isMounted) return
                setLikedPosts(results)
            } catch {
                if (!isMounted) return
                setLikedPosts([])
            } finally {
                if (isMounted) {
                    setLikedStatus("idle")
                }
            }
        }

        loadLiked()

        return () => {
            isMounted = false
        }
    }, [activeTab, id])

    const handleCopyAddress = async () => {
        if (!id || isCopying) return
        setIsCopying(true)
        try {
            const didCopy = await copyToClipboard(id)
            if (didCopy) {
                toast.success("Wallet address copied")
            } else {
                toast.error("Failed to copy wallet address")
            }
        } finally {
            setIsCopying(false)
        }
    }

    const handleFollow = async () => {
        if (!contextUser?.user?.id) {
            await contextUser?.openConnect()
            return
        }
        if (contextUser.user.id === id) return

        try {
            setIsFollowLoading(true)
            const nextState = await toggleFollow(contextUser.user.id, id)
            setIsFollowing(nextState)
            setFollowerCount((prev) => Math.max(0, prev + (nextState ? 1 : -1)))
        } catch (error) {
            console.error(error)
        } finally {
            setIsFollowLoading(false)
        }
    }

    return (
        <>
            <MainLayout>
                <div className="mx-auto mt-[80px] w-full max-w-5xl px-3 pb-16">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">

	                        <ClientOnly>
		                            {currentProfile?.image ? (
		                                <Image
		                                    className="h-[120px] w-[120px] rounded-full object-cover"
		                                    src={createBucketUrl(currentProfile?.image)}
		                                    alt={`${displayName || handle} avatar`}
		                                    width={120}
		                                    height={120}
		                                    sizes="120px"
		                                    unoptimized
		                                    loader={({ src }) => src}
		                                />
		                            ) : (
		                                <div className="h-[120px] w-[120px] rounded-full bg-gray-200 dark:bg-white/10" />
		                            )}
	                        </ClientOnly>

                        <div className="w-full sm:pl-5">
                            <ClientOnly>
                                {displayName ? (
                                    <div>
                                        <p className="text-[28px] font-bold truncate text-gray-900 dark:text-white">
                                            {displayName}
                                        </p>
                                        <p className="text-[16px] text-gray-500 truncate dark:text-white/60">
                                            @{handle}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="h-[60px]" />
                                )}
                            </ClientOnly>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-white/10 dark:text-white/70">
                                    Wallet
                                </span>
                                <div className="flex flex-1 flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 dark:border-white/10 dark:bg-black dark:text-white/70">
                                    <span className="font-mono break-all">{id}</span>
                                    <button
                                        onClick={() => void handleCopyAddress()}
                                        className="ml-auto inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
                                        disabled={isCopying}
                                        aria-label="Copy wallet address"
                                    >
                                        <AiOutlineCopy size={14} />
                                        Copy
                                    </button>
                                </div>
                            </div>

                            
                            {contextUser?.user?.id === id ? (
                                <button
                                    onClick={() => setIsEditProfileOpen(!isEditProfileOpen)}
                                    className="flex item-center rounded-md py-1.5 px-3.5 mt-3 text-[15px] font-semibold border border-gray-200 hover:bg-gray-100 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                                >
                                    <BsPencil className="mt-0.5 mr-1" size="18"/>
                                    <span>Edit profile</span>
                                </button>
                            ) : (
                                <div className="mt-3 flex flex-wrap gap-3">
                                    <button
                                        onClick={() => void handleFollow()}
                                        disabled={isFollowLoading}
                                        aria-pressed={isFollowing}
                                        className={`flex item-center rounded-md py-1.5 px-6 text-[15px] font-semibold border ${
                                            isFollowing
                                                ? "border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
                                                : "border-[color:var(--brand-accent)] bg-[color:var(--brand-accent)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-accent-strong)]"
                                        }`}
                                    >
                                        {isFollowing ? "Following" : "Follow"}
                                    </button>
                                    <Link
                                        href={`/boost/${id}`}
                                        className="flex item-center rounded-md border border-[color:var(--brand-accent)] px-6 py-1.5 text-[15px] font-semibold text-[color:var(--brand-accent-text)] hover:bg-[color:var(--brand-accent-soft)]"
                                    >
                                        Boost with yield
                                    </Link>
                                </div>
                            )}
                        </div>

                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-4">
                        <div className="mr-4">
                            <span className="font-bold">{followingCount}</span>
                            <span className="text-gray-500 font-light text-[15px] pl-1.5 dark:text-white/60">Following</span>
                        </div>
                        <div className="mr-4">
                            <span className="font-bold">{followerCount}</span>
                            <span className="text-gray-500 font-light text-[15px] pl-1.5 dark:text-white/60">Followers</span>
                        </div>
                    </div>

                    <ClientOnly>
                        <p className="pt-4 mr-4 text-gray-500 font-light text-[15px] pl-1.5 max-w-[500px] dark:text-white/60">
                            {currentProfile?.bio}
                        </p>
                    </ClientOnly>

                    <ul className="w-full flex items-center pt-4 border-b border-gray-200 dark:border-white/10">
                        <li className="w-60 text-center">
                            <button
                                onClick={() => setActiveTab("videos")}
                                className={`w-full py-2 text-[17px] font-semibold ${
                                    activeTab === "videos"
                                        ? "border-b-2 border-b-black text-black dark:border-b-white dark:text-white"
                                        : "text-gray-500 dark:text-white/60"
                                }`}
                            >
                                Videos
                            </button>
                        </li>
                        <li className="w-60 text-center">
                            <button
                                onClick={() => setActiveTab("liked")}
                                className={`w-full py-2 text-[17px] font-semibold ${
                                    activeTab === "liked"
                                        ? "border-b-2 border-b-black text-black dark:border-b-white dark:text-white"
                                        : "text-gray-500 dark:text-white/60"
                                }`}
                            >
                                Liked
                            </button>
                        </li>
                    </ul>

                    <ClientOnly>
                        {activeTab === "liked" && likedStatus === "loading" ? (
                            <div className="mt-6 text-sm text-gray-500 dark:text-white/60">
                                Loading liked clips...
                            </div>
                        ) : (
                            <div className="mt-4 grid 2xl:grid-cols-6 xl:grid-cols-5 lg:grid-cols-4 md:grid-cols-3 grid-cols-2 gap-3">
                                {(activeTab === "videos" ? postsByUser : likedPosts)?.map((post, index) => (
                                    <PostUser key={index} post={post} />
                                ))}
                            </div>
                        )}
                        {activeTab === "videos" && postsByUser.length === 0 ? (
                            <div className="mt-6 text-sm text-gray-500 dark:text-white/60">
                                No clips yet. Upload a new video to get started.
                            </div>
                        ) : null}
                        {activeTab === "liked" && likedStatus === "idle" && likedPosts.length === 0 ? (
                            <div className="mt-6 text-sm text-gray-500 dark:text-white/60">
                                No liked clips yet. Tap the heart on a video to save it here.
                            </div>
                        ) : null}
                    </ClientOnly>

                    <div className="pb-20" />
                </div>
            </MainLayout>
        </>
    )
}
