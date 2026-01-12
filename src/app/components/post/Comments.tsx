import { useState } from "react"
import SingleComment from "./SingleComment"
import { useUser } from "@/app/context/user"
import { BiLoaderCircle } from "react-icons/bi"
import ClientOnly from "../ClientOnly"
import { useCommentStore } from "@/app/stores/comment"
import createComment from "@/app/hooks/useCreateComment"
import { CommentsCompTypes } from "@/app/types"

export default function Comments({ params }: CommentsCompTypes) {

    const { commentsByPost, setCommentsByPost } = useCommentStore()

    const contextUser = useUser()
    const [comment, setComment] = useState<string>('')
    const [inputFocused, setInputFocused] = useState<boolean>(false)
    const [isUploading, setIsUploading] = useState<boolean>(false)

    const addComment = async () => {
        if (!contextUser?.user) return void contextUser?.openConnect()

        try {
            setIsUploading(true)
            await createComment(contextUser?.user?.id, params?.postId, comment)
            setCommentsByPost(params?.postId)
            setComment('')
            setIsUploading(false)
        } catch (error) {
            console.log(error)
            alert(error)
        }
    }

    return (
        <>
            <div 
                id="Comments" 
                className="relative z-0 w-full h-[calc(100%-273px)] overflow-auto border-t-2 border-gray-200 bg-[#F8F8F8] text-gray-900 dark:border-white/10 dark:bg-[#0f0f12] dark:text-white"
            >
   
                <div className="pt-2"/>

                <ClientOnly>
                    {commentsByPost.length < 1 ? (
                        <div className="text-center mt-6 text-xl text-gray-500 dark:text-white/60">
                            No comments...
                        </div>
                    ) : (
                        <div>
                            {commentsByPost.map((comment, index) => (
                                <SingleComment key={index} comment={comment} params={params} />
                            ))}
                        </div>
                    )}
                </ClientOnly>

                <div className="mb-28" />
                
            </div>

            <div 
                id="CreateComment" 
                className="absolute bottom-0 flex h-[85px] w-full items-center justify-between border-t-2 border-gray-200 bg-white px-8 py-5 lg:max-w-[550px] dark:border-white/10 dark:bg-black"
            >
                <div 
                    className={`
                        flex items-center rounded-lg w-full lg:max-w-[420px] border-2 bg-[#F1F1F2] dark:bg-white/10
                        ${inputFocused ? 'border-gray-400 dark:border-white/30' : 'border-[#F1F1F2] dark:border-white/10'}
                    `}
                >
                    <input 
                        onFocus={() => setInputFocused(true)}
                        onBlur={() => setInputFocused(false)}
                        onChange={e => setComment(e.target.value)}
                        value={comment || ''}
                        className="w-full rounded-lg bg-transparent p-2 text-[14px] text-gray-900 placeholder:text-gray-500 focus:outline-none dark:text-white dark:placeholder:text-white/60" 
                        type="text"
                        placeholder="Add comment..."
                    />
                </div>
                {!isUploading ? (
                    <button
                        disabled={!comment}
                        onClick={() => addComment()}
                        className={`
                            font-semibold text-sm ml-5 pr-1
                            ${comment ? 'text-[color:var(--brand-accent-text)] cursor-pointer' : 'text-gray-400 dark:text-white/40'}
                        `}
                    >
                        Post
                    </button>
                ) : (
                    <BiLoaderCircle className="animate-spin" color="var(--brand-accent-text)" size="20" />
                )}
                
            </div>
        </>
    )
}
