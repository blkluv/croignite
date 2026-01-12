import { AiOutlineLoading3Quarters } from "react-icons/ai"
import moment from "moment"
import { useCallback, useRef } from "react"
import Link from "next/link"
import createBucketUrl from "@/app/hooks/useCreateBucketUrl"
import { PostUserCompTypes } from "@/app/types"

export default function PostUser({ post }: PostUserCompTypes) {

    const videoRef = useRef<HTMLVideoElement>(null)

    const handleMouseEnter = useCallback(() => {
        const video = videoRef.current
        if (!video) return
        const playPromise = video.play()
        if (playPromise) {
            playPromise.catch((error) => {
                if (error?.name !== "AbortError") {
                    console.warn(error)
                }
            })
        }
    }, [])

    const handleMouseLeave = useCallback(() => {
        const video = videoRef.current
        if (!video) return
        video.pause()
    }, [])

    return (
        <>
            <div className="relative brightness-90 hover:brightness-[1.1] cursor-pointer">
               {!post.video_url ? (
                    <div className="absolute flex items-center justify-center top-0 left-0 aspect-[3/4] w-full object-cover rounded-md bg-black">
                        <AiOutlineLoading3Quarters className="animate-spin ml-1" size="80" color="#FFFFFF" />
                    </div>
                ) : (
                    <Link href={`/post/${post.id}/${post.user_id}`}>
                        <video
                            id={`video${post.id}`}
                            ref={videoRef}
                            muted
                            loop
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            className="aspect-[3/4] object-cover rounded-md" 
                            src={createBucketUrl(post.video_url, "")}
                        />
                    </Link>
                )}
                <div className="px-1">
                    <p className="text-[15px] pt-1 break-words text-gray-700 dark:text-white/80">
                        {post.text}
                    </p>
                    <div className="text-xs font-semibold text-gray-600 dark:text-white/60">
                        Posted {moment(post.created_at).fromNow()}
                    </div>
                </div>
            </div>
        </>
    )
}
