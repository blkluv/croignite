import { useUser } from "@/app/context/user"
import Link from "next/link"
import { useState } from "react"
import { BiLoaderCircle } from "react-icons/bi"
import { BsTrash3 } from "react-icons/bs"
import { useCommentStore } from "@/app/stores/comment"
import moment from "moment"
import deleteComment from "@/app/hooks/useDeleteComment"
import createBucketUrl from "@/app/hooks/useCreateBucketUrl"
import Image from "next/image"
import { SingleCommentCompTypes } from "@/app/types"
import { formatShortHash } from "@/lib/utils"

export default function SingleComment({ comment, params }: SingleCommentCompTypes) {

    const contextUser = useUser()
    const { setCommentsByPost } = useCommentStore()
    const [isDeleting, setIsDeleting] = useState(false)

    const deleteThisComment = async () => {
        const res = confirm("Are you sure you weant to delete this comment?")
        if (!res) return

        try {
            setIsDeleting(true)
            await deleteComment(comment?.id)
            setCommentsByPost(params?.postId)
            setIsDeleting(false)
        } catch (error) {
            console.log(error)
            alert(error)
        }
    }
    return (
        <>
            <div id="SingleComment" className="flex items-center justify-between px-8 mt-4 text-gray-900 dark:text-white">
                <div className="flex items-center relative w-full">
                    <Link href={`/profile/${comment.profile.user_id}`}>
                        <Image
                            className="absolute top-0 rounded-full object-cover lg:mx-0 mx-auto"
                            width={40}
                            height={40}
                            src={createBucketUrl(comment.profile.image)}
                            alt={`${comment.profile.name ?? "User"} avatar`}
                            unoptimized
                            loader={({ src }) => src}
                        />
                    </Link>
                    <div className="ml-14 pt-0.5 w-full">

                        <div className="text-[18px] font-semibold flex items-center justify-between">
                            <span className="flex flex-col">
                                <span>{comment?.profile?.name}</span>
                                <span className="text-[12px] text-gray-600 font-light dark:text-white/60">
                                    @{comment?.profile?.username
                                        ? comment.profile.username
                                        : formatShortHash(comment?.profile?.user_id ?? "")}
                                    <span className="px-1" aria-hidden="true">&middot;</span>
                                    {moment(comment?.created_at).calendar()}
                                </span>
                            </span>

                            {contextUser?.user?.id == comment.profile.user_id ? (
                                <button 
                                    disabled={isDeleting} 
                                    onClick={() => deleteThisComment()}
                                    className="text-gray-500 hover:text-gray-700 dark:text-white/60 dark:hover:text-white"
                                >
                                    {isDeleting 
                                        ? <BiLoaderCircle className="animate-spin" color="var(--brand-accent-text)" size="20"/>
                                        : <BsTrash3 className="cursor-pointer" size="25"/>
                                    }
                                </button>
                            ) : null}
                        </div>
                        
                        <p className="text-[15px] font-light text-gray-800 dark:text-white/80">{comment.text}</p>

                    </div>
                </div>
            </div>
        </>
    )
}
