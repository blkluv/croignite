import createBucketUrl from "@/app/hooks/useCreateBucketUrl"
import { MenuItemFollowCompTypes } from "@/app/types"
import { formatShortHash } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { AiOutlineCheck } from "react-icons/ai"

export default function MenuItemFollow({ user }: MenuItemFollowCompTypes) {
    
    return (
        <>
            <Link 
                href={`/profile/${user?.id}`}
                className="flex items-center rounded-md w-full py-1.5 px-2 transition-colors hover:bg-muted/60"
            >
                <Image
                    className="rounded-full object-cover lg:mx-0 mx-auto"
                    width={35}
                    height={35}
                    src={createBucketUrl(user?.image)}
                    alt={`${user?.name ?? "User"} avatar`}
                    unoptimized
                    loader={({ src }) => src}
                />
                <div className="lg:pl-2.5 lg:block hidden">
                    <div className="flex items-center">
                        <p className="font-bold text-[14px] truncate text-foreground">
                            {user?.name}
                        </p>
                        <p className="ml-1 rounded-full bg-[color:var(--brand-success)] h-[14px] relative">
                            <AiOutlineCheck className="relative p-[3px]" color="#FFFFFF" size="15"/>
                        </p>
                    </div>

                    <p className="font-light text-[12px] text-muted-foreground">
                        {user?.username
                          ? `@${user.username}`
                          : `@${formatShortHash(user?.id || "")}`}
                    </p>
                </div>
            </Link>
        </>
    )
}
