import { AiFillHeart } from "react-icons/ai"
import { FaCommentDots, FaBolt, FaBullhorn } from "react-icons/fa"
import { FiCheck, FiPlus } from "react-icons/fi"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useUser } from "../context/user"
import { BiLoaderCircle } from "react-icons/bi"
import { Comment, Like, PostMainLikesCompTypes } from "../types"
import getCommentsByPostId from "../hooks/useGetCommentsByPostId"
import getLikesByPostId from "../hooks/useGetLikesByPostId"
import isLiked from "../hooks/useIsLiked"
import createLike from "../hooks/useCreateLike"
import deleteLike from "../hooks/useDeleteLike"
import getIsFollowing from "../hooks/useIsFollowing"
import toggleFollow from "../hooks/useToggleFollow"
import { cn } from "@/lib/utils"

type PostMainLikesProps = PostMainLikesCompTypes & {
    className?: string
    avatarUrl?: string
    profileUrl?: string
}

export default function PostMainLikes({ post, className, avatarUrl, profileUrl }: PostMainLikesProps) {

    const contextUser = useUser()
    const [hasClickedLike, setHasClickedLike] = useState<boolean>(false)
    const [comments, setComments] = useState<Comment[]>([])
    const [likes, setLikes] = useState<Like[]>([])
    const [isFollowing, setIsFollowing] = useState(false)
    const [isFollowLoading, setIsFollowLoading] = useState(false)

    const getAllCommentsByPost = useCallback(async () => {
        const result = await getCommentsByPostId(post?.id)
        setComments(result)
    }, [post?.id])

    const getAllLikesByPost = useCallback(async () => {
        const result = await getLikesByPostId(post?.id)
        setLikes(result)
    }, [post?.id])

    useEffect(() => { 
        void getAllLikesByPost()
        void getAllCommentsByPost()
    }, [getAllCommentsByPost, getAllLikesByPost])

    const userLiked = useMemo(() => {
        if (!contextUser?.user?.id) return false
        if (!post?.id) return false
        if (likes?.length < 1) return false
        return isLiked(contextUser.user.id, post.id, likes)
    }, [contextUser?.user?.id, likes, post?.id])

    useEffect(() => {
        let isMounted = true

        const loadFollowState = async () => {
            if (!contextUser?.user?.id || contextUser.user.id === post.profile.user_id) {
                if (isMounted) setIsFollowing(false)
                return
            }

            try {
                const result = await getIsFollowing(contextUser.user.id, post.profile.user_id)
                if (!isMounted) return
                setIsFollowing(result)
            } catch {
                if (!isMounted) return
                setIsFollowing(false)
            }
        }

        loadFollowState()

        return () => {
            isMounted = false
        }
    }, [contextUser?.user?.id, post.profile.user_id])

    const like = async () => {
        setHasClickedLike(true)
        await createLike(contextUser?.user?.id || '', post?.id)
        await getAllLikesByPost()
        setHasClickedLike(false)
    }

    const unlike = async (postId: string, userId: string) => {
        setHasClickedLike(true)
        await deleteLike(postId, userId)
        await getAllLikesByPost()
        setHasClickedLike(false)
    }

    const likeOrUnlike = () => {
        if (!contextUser?.user?.id) {
            void contextUser?.openConnect()
            return
        }
        
        const liked = isLiked(contextUser?.user?.id, post?.id, likes)

        if (!liked) {
            like()
        } else {
            likes.forEach((like: Like) => {
                if (contextUser?.user?.id == like?.user_id && like?.post_id == post?.id) {
                    void unlike(post?.id, contextUser?.user?.id)
                }
            })
        }
    }

    const handleFollow = async () => {
        if (!contextUser?.user?.id) {
            await contextUser?.openConnect()
            return
        }
        if (contextUser.user.id === post.profile.user_id) return

        try {
            setIsFollowLoading(true)
            const nextState = await toggleFollow(contextUser.user.id, post.profile.user_id)
            setIsFollowing(nextState)
        } catch (error) {
            console.error(error)
        } finally {
            setIsFollowLoading(false)
        }
    }

    const showFollow = Boolean(
        contextUser?.user?.id && contextUser.user.id !== post.profile.user_id,
    )

    return (
        <>
            <div
                id={`PostMainLikes-${post?.id}`}
                className={cn(
                    "flex flex-col items-center justify-end gap-4 text-gray-800 dark:text-white",
                    className,
                )}
            >
                {avatarUrl && profileUrl ? (
                    <div className="relative flex flex-col items-center">
                        <Link
                            href={profileUrl}
                            className="relative block h-12 w-12 overflow-hidden rounded-full border-2 border-white/80 shadow-lg"
                            aria-label="View creator profile"
                        >
                            <Image
                                className="object-cover"
                                src={avatarUrl}
                                alt={`${post.profile.name} avatar`}
                                fill
                                sizes="48px"
                                unoptimized
                                loader={({ src }) => src}
                            />
                        </Link>
                        {showFollow && (
                            <button
                                type="button"
                                onClick={() => void handleFollow()}
                                disabled={isFollowLoading}
                                aria-label={isFollowing ? "Following creator" : "Follow creator"}
                                className="absolute -bottom-2 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[color:var(--brand-accent)] text-[color:var(--brand-ink)] shadow-lg"
                            >
                                {isFollowing ? <FiCheck size={14} /> : <FiPlus size={14} />}
                            </button>
                        )}
                    </div>
                ) : null}

                <div className="flex flex-col items-center gap-1 text-center">
                    <button 
                        disabled={hasClickedLike}
                        onClick={() => likeOrUnlike()} 
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 text-gray-700 shadow-lg transition hover:bg-gray-300 dark:bg-black/50 dark:text-white dark:hover:bg-black/70"
                        aria-label="Like"
                    >
                        {!hasClickedLike ? (
                            <AiFillHeart color={likes?.length > 0 && userLiked ? 'var(--brand-accent)' : ''} size="24"/>
                        ) : (
                            <BiLoaderCircle className="animate-spin" size="24"/>
                        )}
                    </button>
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-white/80">
                        {likes?.length}
                    </span>
                </div>

                <Link
                    href={`/post/${post?.id}/${post?.profile?.user_id}`}
                    className="flex flex-col items-center gap-1 text-center"
                    aria-label="View comments"
                >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 text-gray-700 shadow-lg transition hover:bg-gray-300 dark:bg-black/50 dark:text-white dark:hover:bg-black/70">
                        <FaCommentDots size="22"/>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-white/80">
                        {comments?.length}
                    </span>
                </Link>

                <Link
                    href={`/boost/${post?.profile?.user_id}`}
                    className="flex flex-col items-center gap-1 text-center"
                    aria-label="Boost creator"
                >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 text-gray-700 shadow-lg transition hover:bg-gray-300 dark:bg-black/50 dark:text-white dark:hover:bg-black/70">
                        <FaBolt size="22"/>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-white/80">
                        Boost
                    </span>
                </Link>

                <Link
                    href={`/sponsor/${post?.id}`}
                    className="flex flex-col items-center gap-1 text-center"
                    aria-label="Sponsor clip"
                >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 text-gray-700 shadow-lg transition hover:bg-gray-300 dark:bg-black/50 dark:text-white dark:hover:bg-black/70">
                        <FaBullhorn size="21"/>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-white/80">
                        Sponsor
                    </span>
                </Link>

                <Link
                    href={`/sponsor/${post?.id}?mode=x402`}
                    className="flex flex-col items-center gap-1 text-center"
                    aria-label="Sponsor via x402"
                >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 text-gray-700 shadow-lg transition hover:bg-gray-300 dark:bg-black/50 dark:text-white dark:hover:bg-black/70">
                        <FaBullhorn size="19"/>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-white/80">
                        x402
                    </span>
                </Link>
            </div>
        </>
    )
}
