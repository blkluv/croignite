"use client"

import React, { useEffect, useState } from "react";
import UploadLayout from "../layouts/UploadLayout";
import { BiLoaderCircle, BiSolidCloudUpload } from "react-icons/bi"
import { AiOutlineCheckCircle } from "react-icons/ai";
import { PiKnifeLight } from 'react-icons/pi'
import { useRouter } from "nextjs-toploader/app";
import { useUser } from "@/app/context/user"
import { UploadError } from "../types";
import createPost from "../hooks/useCreatePost";
import { ClipVideoPlayer } from "@/components/data-display/ClipVideoPlayer";
import Image from "next/image";

export default function Upload() {
    const contextUser = useUser()
    const router = useRouter()

    const [fileDisplay, setFileDisplay] = useState<string>('');
    const [caption, setCaption] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<UploadError | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);

    useEffect(() => {
        if (!contextUser?.user) router.push('/')
    }, [contextUser?.user, router])

    const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;

        if (files && files.length > 0) {
            const file = files[0];
            const fileUrl = URL.createObjectURL(file);
            setFileDisplay(fileUrl);
            setFile(file);
        }
    }

    const discard = () => {
        setFileDisplay('')
        setFile(null)
        setCaption('')
    }

    const clearVideo = () => {
        setFileDisplay('')
        setFile(null)
    }

    const validate = () => {
        setError(null)
        let isError = false

        if (!file) {
            setError({ type: 'File', message: 'A video is required'})
            isError = true
        } else if (!caption) {
            setError({ type: 'caption', message: 'A caption is required'})
            isError = true
        }
        return isError
    }

    const createNewPost = async () => {
        const isError = validate()
        if (isError) return
        if (!file || !contextUser?.user) return
        setIsUploading(true)

        try {
            await createPost(file, contextUser?.user?.id, caption)
            router.push(`/profile/${contextUser?.user?.id}`)
            setIsUploading(false)
        } catch (error) {
            console.log(error)
            setIsUploading(false)
            alert(error)
        }
    }

    return (
        <>
            <UploadLayout>
                <div className="w-full mt-[80px] mb-[40px] rounded-md bg-white py-6 px-4 shadow-lg md:px-10 dark:bg-[#0f0f12] dark:shadow-none dark:border dark:border-white/10">
                    <div>
                        <h1 className="text-[23px] font-semibold text-gray-900 dark:text-white">
                          Upload video
                        </h1>
                        <h2 className="mt-1 text-gray-400 dark:text-white/60">
                          Post a video to your account
                        </h2>
                    </div>

                    <div className="mt-8 md:flex gap-6">

                        {!fileDisplay ? 
                            <label 
                                htmlFor="fileInput"
                                className="
                                    md:mx-0
                                    mx-auto
                                    mt-4
                                    mb-6
                                    flex 
                                    flex-col 
                                    items-center 
                                    justify-center 
                                    w-full 
                                    max-w-[260px] 
                                    h-[470px] 
                                    text-center 
                                    p-3 
                                    border-2 
                                    border-dashed 
                                    border-gray-300 
                                    rounded-lg 
                                    hover:bg-gray-100 
                                    cursor-pointer
                                    dark:border-white/10
                                    dark:text-white/80
                                    dark:hover:bg-white/5
                                "
                            >
                                <BiSolidCloudUpload size="40" color="#b3b3b1"/>
                                <p className="mt-4 text-[17px] text-gray-900 dark:text-white">
                                  Select video to upload
                                </p>
                                <p className="mt-1.5 text-[13px] text-gray-500 dark:text-white/60">
                                  Or drag and drop a file
                                </p>
                                <p className="mt-12 text-sm text-gray-400 dark:text-white/40">MP4</p>
                                <p className="mt-2 text-[13px] text-gray-400 dark:text-white/40">
                                  Up to 30 minutes
                                </p>
                                <p className="mt-2 text-[13px] text-gray-400 dark:text-white/40">
                                  Less than 2 GB
                                </p>
                                <label 
                                    htmlFor="fileInput" 
                                    className="px-2 py-1.5 mt-8 text-[15px] w-[80%] rounded-sm cursor-pointer font-semibold bg-[color:var(--brand-accent)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-accent-strong)]"
                                >
                                    Select file
                                </label>
                                <input 
                                    type="file" 
                                    id="fileInput"
                                    onChange={onChange}
                                    hidden 
                                    accept=".mp4" 
                                />
                            </label>
                        :
                            <div
                                className="
                                    md:mx-0
                                    mx-auto
                                    mt-4
                                    md:mb-12
                                    mb-16
                                    flex 
                                    items-center 
                                    justify-center 
                                    w-full 
                                    max-w-[260px] 
                                    h-[540px] 
                                    p-3 
                                    rounded-2xl
                                    cursor-pointer
                                    relative
                                "
                            >
                                {isUploading ? (
                                    <div className="absolute flex items-center justify-center z-20 bg-black h-full w-full rounded-[50px] bg-opacity-50">
                                        <div className="mx-auto flex items-center justify-center gap-1">
                                            <BiLoaderCircle className="animate-spin" color="var(--brand-accent)" size={30} />
                                            <div className="text-white font-bold">Uploading...</div>
                                        </div>
                                    </div>
                                ) : null}
                                
                                <Image
                                    className="absolute z-20 pointer-events-none"
                                    src="/images/mobile-case.png"
                                    alt=""
                                    width={473}
                                    height={990}
                                />
                                <Image
                                    className="absolute right-4 bottom-6 z-20"
                                    src="/images/croignite-logo.png"
                                    alt="CroIgnite"
                                    width={90}
                                    height={90}
                                    sizes="90px"
                                />
                                <ClipVideoPlayer
                                    src={fileDisplay}
                                    autoPlay={false}
                                    loop
                                    showLogo={false}
                                    className="absolute z-10 p-[13px] w-full h-full"
                                    videoClassName="object-cover"
                                />

                                <div className="absolute -bottom-12 z-50 flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white/90 p-2 text-gray-900 dark:border-white/10 dark:bg-black/80 dark:text-white">
                                    <div className="flex items-center truncate">
                                        <AiOutlineCheckCircle size="16" className="min-w-[16px]"/>
                                        <p className="text-[11px] pl-1 truncate text-ellipsis">{file?.name}</p>
                                    </div>
                                    <button onClick={() => clearVideo()} className="text-[11px] ml-2 font-semibold text-gray-700 dark:text-white/80">
                                        Change
                                    </button>
                                </div>
                            </div>
                        }


                        <div className="mt-4 mb-6">
                            <div className="flex bg-[#F8F8F8] py-4 px-6 text-gray-900 dark:bg-white/5 dark:text-white">
                                <div>
                                    <PiKnifeLight className="mr-4" size="20"/>
                                </div>
                                <div>
                                    <div className="font-semibold text-[15px] mb-1.5">Divide videos and edit</div>
                                    <div className="font-semibold text-[13px] text-gray-400 dark:text-white/60">
                                        You can quickly divide videos into multiple parts, remove redundant parts and turn landscape videos into portrait videos
                                    </div>
                                </div>
                                <div className="flex justify-end max-w-[130px] w-full h-full text-center my-auto">
                                    <button
                                      onClick={() => router.push("/projects?create=1")}
                                      className="px-8 py-1.5 text-[15px] font-semibold rounded-sm bg-[color:var(--brand-accent)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-accent-strong)]"
                                    >
                                        Edit
                                    </button>
                                </div>
                            </div>

                            <div className="mt-5">
                                <div className="flex items-center justify-between">
                                    <div className="mb-1 text-[15px] text-gray-900 dark:text-white">Caption</div>
                                    <div className="text-gray-400 text-[12px] dark:text-white/60">{caption.length}/150</div>
                                </div>
                                <input 
                                    maxLength={150}
                                    type="text"
                                    className="
                                        w-full
                                        border
                                        p-2.5
                                        rounded-md
                                        focus:outline-none
                                        bg-white
                                        text-gray-900
                                        border-gray-300
                                        placeholder:text-gray-400
                                        dark:bg-black/60
                                        dark:text-white
                                        dark:border-white/10
                                        dark:placeholder:text-white/40
                                    "
                                    value={caption}
                                    onChange={event => setCaption(event.target.value)}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    disabled={isUploading}
                                    onClick={() => discard()}
                                    className="mt-8 rounded-sm border border-gray-300 px-10 py-2.5 text-[16px] font-semibold text-gray-800 hover:bg-gray-100 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                                >
                                    Discard
                                </button>
                                <button 
                                    disabled={isUploading}
                                    onClick={() => createNewPost()}
                                    className="px-10 py-2.5 mt-8 border text-[16px] font-semibold rounded-sm border-[color:var(--brand-accent)] bg-[color:var(--brand-accent)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-accent-strong)]"
                                >
                                    {isUploading ? <BiLoaderCircle className="animate-spin" color="var(--brand-ink)" size={25} /> : 'Post'}
                                </button>
                            </div>

                            {error ? (
                                <div className="mt-4 text-[color:var(--brand-accent-text)]">
                                    {error.message}
                                </div>
                            ) : null}

                        </div>

                    </div>
                </div>
            </UploadLayout>
        </>
    )
}
