"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import PostMainLikes from "./PostMainLikes"
import createBucketUrl from "../hooks/useCreateBucketUrl"
import { PostMainCompTypes } from "../types"
import getSponsorCampaignByPostId from "../hooks/useGetSponsorCampaignByPostId"
import { isSponsorCampaignActive } from "@/features/sponsor/utils"
import type { SponsorCampaign } from "@/app/types"
import { formatShortHash } from "@/lib/utils"
import { useGeneralStore } from "@/app/stores/general"
import { ClipVideoPlayer } from "@/components/data-display/ClipVideoPlayer"

type PostMainProps = PostMainCompTypes & {
    onAutoAdvance?: () => void
}

export default function PostMain({ post, onAutoAdvance }: PostMainProps) {
    const [sponsorCampaign, setSponsorCampaign] = useState<SponsorCampaign | null>(null)
    const { isAutoScrollEnabled } = useGeneralStore()

    useEffect(() => {
        let isMounted = true

        const loadSponsor = async () => {
            if (!post?.id) return
            try {
                const campaign = await getSponsorCampaignByPostId(post.id)
                if (isMounted) {
                    setSponsorCampaign(campaign)
                }
            } catch {
                if (isMounted) {
                    setSponsorCampaign(null)
                }
            }
        }

        loadSponsor()

        return () => {
            isMounted = false
        }
    }, [post?.id])

    const isSponsored = useMemo(() => {
        return isSponsorCampaignActive(sponsorCampaign)
    }, [sponsorCampaign])

    const handleAutoAdvance = useCallback(() => {
        if (!isAutoScrollEnabled) return
        if (onAutoAdvance) onAutoAdvance()
    }, [isAutoScrollEnabled, onAutoAdvance])

    const profileUrl = `/profile/${post.profile.user_id}`
    const avatarUrl = createBucketUrl(post?.profile?.image)
    const usernameLabel = post.profile.username
        ? `@${post.profile.username}`
        : `@${formatShortHash(post.profile.user_id)}`
    const caption = post.text?.trim()

    return (
        <>
            <div
                id={`PostMain-${post.id}`}
                className="feed-item relative flex h-[calc(100vh-60px)] w-full items-center justify-center overflow-hidden border-b border-gray-200 dark:border-white/10"
            >
                <div className="mx-auto flex w-full max-w-[980px] flex-col items-center justify-center gap-6 py-6 lg:flex-row lg:items-end">
                    <div className="relative w-full max-w-[520px]">
                        <ClipVideoPlayer
                            src={createBucketUrl(post?.video_url, "")}
                            observeVisibility
                            loop={!isAutoScrollEnabled}
                            onEnded={handleAutoAdvance}
                            showLogo={false}
                            meta={{
                                title: (
                                    <Link href={profileUrl} className="text-white/95 hover:underline">
                                        {usernameLabel}
                                    </Link>
                                ),
                                description: caption,
                                badge: isSponsored ? (
                                    <Link
                                        href={`/sponsor/${post.id}`}
                                        className="rounded-full border border-white/60 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80"
                                    >
                                        Sponsored
                                    </Link>
                                ) : null,
                            }}
                            className="h-[70vh] max-h-[740px] w-full"
                        />
                    </div>

                    <PostMainLikes
                        post={post}
                        avatarUrl={avatarUrl}
                        profileUrl={profileUrl}
                        className="pb-6"
                    />
                </div>
            </div>
        </>
    )
}
