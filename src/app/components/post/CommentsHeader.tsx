"use client"

import Link from "next/link"
import { AiFillHeart } from "react-icons/ai"
import { BsChatDots, BsTrash3 } from "react-icons/bs"
import { FaBolt, FaBullhorn } from "react-icons/fa"
import moment from "moment"
import { useUser } from "@/app/context/user"
import { useEffect, useMemo, useState } from "react"
import { BiLoaderCircle } from "react-icons/bi"
import ClientOnly from "../ClientOnly"
import createBucketUrl from "@/app/hooks/useCreateBucketUrl"
import Image from "next/image"
import { useLikeStore } from "@/app/stores/like"
import { useCommentStore } from "@/app/stores/comment"
import { useRouter } from "nextjs-toploader/app"
import isLiked from "@/app/hooks/useIsLiked"
import createLike from "@/app/hooks/useCreateLike"
import deleteLike from "@/app/hooks/useDeleteLike"
import deletePostById from "@/app/hooks/useDeletePostById"
import getIsFollowing from "@/app/hooks/useIsFollowing"
import toggleFollow from "@/app/hooks/useToggleFollow"
import { CommentsHeaderCompTypes } from "@/app/types"
import { formatShortHash } from "@/lib/utils"

export default function CommentsHeader({ post, params }: CommentsHeaderCompTypes) {

    const { setLikesByPost, likesByPost } = useLikeStore()
    const { commentsByPost, setCommentsByPost } = useCommentStore()

    const contextUser = useUser()
    const router = useRouter()
    const [hasClickedLike, setHasClickedLike] = useState<boolean>(false)
    const [isDeleteing, setIsDeleteing] = useState<boolean>(false)
    const [isFollowing, setIsFollowing] = useState(false)
    const [isFollowLoading, setIsFollowLoading] = useState(false)

    useEffect(() => { 
        if (!params?.postId) return
        setCommentsByPost(params.postId) 
        setLikesByPost(params.postId)
    }, [params?.postId, setCommentsByPost, setLikesByPost])

    const userLiked = useMemo(() => {
        if (!contextUser?.user?.id) return false
        if (!params?.postId) return false
        if (likesByPost.length < 1) return false
        return isLiked(contextUser.user.id, params.postId, likesByPost)
    }, [contextUser?.user?.id, likesByPost, params?.postId])
    useEffect(() => {
        let isMounted = true

        const loadFollowState = async () => {
            if (!contextUser?.user?.id || contextUser.user.id === post.user_id) {
                if (isMounted) setIsFollowing(false)
                return
            }
            try {
                const result = await getIsFollowing(contextUser.user.id, post.user_id)
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
    }, [contextUser?.user?.id, post.user_id])
    
    const like = async () => {
        try {
            setHasClickedLike(true)
            await createLike(contextUser?.user?.id || '', params.postId)
            setLikesByPost(params.postId)
            setHasClickedLike(false)
        } catch (error) {
            console.log(error)
            alert(error)
            setHasClickedLike(false)
        }
    }

    const unlike = async (postId: string, userId: string) => {
        try {
            setHasClickedLike(true)
            await deleteLike(postId, userId)
            setLikesByPost(params.postId)
            setHasClickedLike(false)
        } catch (error) {
            console.log(error)
            alert(error)
            setHasClickedLike(false)
        }
    }

    const likeOrUnlike = () => {
        if (!contextUser?.user) return void contextUser?.openConnect()

        const liked = isLiked(contextUser.user.id, params.postId, likesByPost)
        if (!liked) {
            like()
        } else {
            likesByPost.forEach(like => {
                if (contextUser?.user?.id && contextUser.user.id == like.user_id && like.post_id == params.postId) {
                    void unlike(params.postId, contextUser.user.id)
                }
            })
        }
    }

    const deletePost = async () => {
        const res = confirm('Are you sure you want to delete this post?')
        if (!res) return

        setIsDeleteing(true)

        try {
            await deletePostById(params?.postId)
            router.push(`/profile/${params.userId}`)
            setIsDeleteing(false)
        } catch (error) {
            console.log(error)
            setIsDeleteing(false)
            alert(error)
        }
    }

    const handleFollow = async () => {
        if (!contextUser?.user?.id) {
            await contextUser?.openConnect()
            return
        }
        if (contextUser.user.id === post.user_id) return

        try {
            setIsFollowLoading(true)
            const nextState = await toggleFollow(contextUser.user.id, post.user_id)
            setIsFollowing(nextState)
        } catch (error) {
            console.error(error)
        } finally {
            setIsFollowLoading(false)
        }
    }

    const showFollow = post.user_id !== contextUser?.user?.id

    return (
        <>
            <div className="flex items-center justify-between px-8 text-gray-900 dark:text-white">
                <div className="flex items-center">
                    <Link href={`/profile/${post?.user_id}`}>
                        {post?.profile.image ? (
                            <Image
                                className="rounded-full object-cover lg:mx-0 mx-auto"
                                width={40}
                                height={40}
                                src={createBucketUrl(post?.profile.image)}
                                alt={`${post?.profile.name ?? "Creator"} avatar`}
                                unoptimized
                                loader={({ src }) => src}
                            />
                        ) : (
                            <div className="w-[40px] h-[40px] bg-gray-200 rounded-full dark:bg-white/10"></div>
                        )}
                    </Link>
                    <div className="ml-3 pt-0.5">
                        <div className="flex items-center gap-2">
                            <Link
                                href={`/profile/${post?.user_id}`}
                                className="relative z-10 text-[17px] font-semibold hover:underline text-gray-900 dark:text-white"
                            >
                                {post?.profile.name}
                            </Link>
                            {showFollow ? (
                                <button
                                    type="button"
                                    onClick={() => void handleFollow()}
                                    disabled={isFollowLoading}
                                    className="rounded-full border border-[color:var(--brand-accent)] px-3 py-1 text-xs font-semibold text-[color:var(--brand-accent)] transition hover:bg-[color:var(--brand-accent)] hover:text-[color:var(--brand-ink)] disabled:opacity-60"
                                >
                                    {isFollowing ? "Following" : "Follow"}
                                </button>
                            ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 text-[12px] text-gray-600 dark:text-white/60">
                            <span>
                                @
                                {post?.profile.username
                                    ? post.profile.username
                                    : formatShortHash(post?.user_id ?? "")}
                            </span>
                            <span aria-hidden="true">&middot;</span>
                            <span className="font-medium">
                                {moment(post?.created_at).calendar()}
                            </span>
                        </div>
                    </div>
                </div>

                {contextUser?.user?.id == post?.user_id ? (
                    <div>
                        {isDeleteing ? (
                            <BiLoaderCircle className="animate-spin" size="25"/>
                        ) : (
                            <button disabled={isDeleteing} onClick={() => deletePost()} className="text-gray-600 dark:text-white/70">
                                <BsTrash3 className="cursor-pointer" size="25"/>
                            </button>
                        )}
                    </div>
                ) : null}
            </div>

            <p className="px-8 mt-4 text-sm text-gray-900 dark:text-white">{post?.text}</p>

            <div className="flex flex-wrap items-center gap-6 px-8 mt-8 text-gray-800 dark:text-white">
                <ClientOnly>
                    <div className="pb-4 text-center flex items-center">
                        <button 
                            disabled={hasClickedLike}
                            onClick={() => likeOrUnlike()} 
                            className="rounded-full bg-gray-200 p-2 cursor-pointer text-gray-700 dark:bg-white/10 dark:text-white"
                        >
                            {!hasClickedLike ? (
                            <AiFillHeart color={likesByPost.length > 0 && userLiked ? 'var(--brand-accent)' : ''} size="25"/>
                            ) : (
                                <BiLoaderCircle className="animate-spin" size="25"/>
                            )}
                        </button>
                        <span className="text-xs pl-2 text-gray-800 font-semibold dark:text-white/80">
                            {likesByPost.length}
                        </span>
                    </div>
                </ClientOnly>

                <div className="pb-4 text-center flex items-center">
                    <div className="rounded-full bg-gray-200 p-2 cursor-pointer text-gray-700 dark:bg-white/10 dark:text-white">
                        <BsChatDots size={25} />
                    </div>
                    <span className="text-xs pl-2 text-gray-800 font-semibold dark:text-white/80">
                        {commentsByPost?.length}
                    </span>
                </div>

                <Link
                    href={`/boost/${post?.user_id}`}
                    className="pb-4 text-center flex items-center"
                    aria-label="Boost creator"
                >
                    <div className="rounded-full bg-gray-200 p-2 cursor-pointer text-gray-700 dark:bg-white/10 dark:text-white">
                        <FaBolt size={25} />
                    </div>
                    <span className="text-xs pl-2 text-gray-800 font-semibold dark:text-white/80">
                        Boost
                    </span>
                </Link>

                <Link
                    href={`/sponsor/${post?.id}`}
                    className="pb-4 text-center flex items-center"
                    aria-label="Sponsor clip"
                >
                    <div className="rounded-full bg-gray-200 p-2 cursor-pointer text-gray-700 dark:bg-white/10 dark:text-white">
                        <FaBullhorn size={24} />
                    </div>
                    <span className="text-xs pl-2 text-gray-800 font-semibold dark:text-white/80">
                        Sponsor
                    </span>
                </Link>

            </div>
        </>
    )
}
