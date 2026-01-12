"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MenuItem from "./MenuItem";
import MenuItemFollow from "./MenuItemFollow";
import { useEffect, useState } from "react";
import { useUser } from "@/app/context/user";
import ClientOnly from "@/app/components/ClientOnly";
import { useGeneralStore } from "@/app/stores/general";
import getFollowingProfiles from "@/app/hooks/useGetFollowingProfiles";
import type { RandomUsers } from "@/app/types";

export default function SideNavMain() {

    const { setRandomUsers, randomUsers} = useGeneralStore()
    const [followingUsers, setFollowingUsers] = useState<RandomUsers[]>([])
    const [hasMounted, setHasMounted] = useState(false)

    const contextUser = useUser()
    const pathname = usePathname()
    const currentPath = pathname ?? ""
    const resolvedPath = hasMounted ? currentPath : ""
    const isProjectsRoute = resolvedPath.startsWith("/projects")
    const isYieldRoute = resolvedPath === "/yield"
    const isCreatorsRoute =
        resolvedPath.startsWith("/creators") ||
        resolvedPath.startsWith("/profile") ||
        resolvedPath.startsWith("/boost")
    const isActivityRoute = resolvedPath.startsWith("/activity")
    const isLeaderboardRoute = resolvedPath.startsWith("/leaderboard")
    const isIgniteRoute = resolvedPath.startsWith("/ignite")
    const defaultColor = "hsl(var(--foreground))"
    const activeColor = "var(--brand-accent-text)"

    useEffect(() => {
        setHasMounted(true)
    }, [])

    useEffect(() => { setRandomUsers() }, [setRandomUsers])

    useEffect(() => {
        const userId = contextUser?.user?.id
        if (!userId) {
            setFollowingUsers([])
            return
        }

        let isMounted = true

        const loadFollowing = async () => {
            try {
                const result = await getFollowingProfiles(userId, 6)
                if (!isMounted) return
                setFollowingUsers(result)
            } catch {
                if (!isMounted) return
                setFollowingUsers([])
            }
        }

        loadFollowing()

        return () => {
            isMounted = false
        }
    }, [contextUser?.user?.id])
    return (
        <>
            <div 
                id="SideNavMain" 
                className="fixed left-0 top-0 z-20 h-full w-[82px] overflow-auto border-r border-border/60 bg-card/80 pt-[64px] backdrop-blur lg:w-[320px] dark:border-white/10"
            >
                
                <div className="lg:w-full w-[55px] mx-auto">
                    <Link href="/">
                        <MenuItem 
                            iconString="For You" 
                            colorString={resolvedPath === '/' ? activeColor : defaultColor} 
                            sizeString="25"
                        />
                    </Link>
                    <Link href="/following">
                        <MenuItem
                            iconString="Following"
                            colorString={resolvedPath === '/following' ? activeColor : defaultColor}
                            sizeString="25"
                        />
                    </Link>
                    <Link href="/projects">
                        <MenuItem
                            iconString="Projects"
                            colorString={isProjectsRoute ? activeColor : defaultColor}
                            sizeString="25"
                        />
                    </Link>

                    <div className="border-b lg:ml-2 mt-2 border-border/60 dark:border-white/10" />
                    <h3 className="lg:block hidden text-xs font-semibold text-muted-foreground pt-4 pb-2 px-2">
                        RealFi
                    </h3>

                    <Link href="/yield">
                        <MenuItem
                            iconString="Yield vault"
                            colorString={isYieldRoute ? activeColor : defaultColor}
                            sizeString="25"
                        />
                    </Link>
                    <Link href="/creators">
                        <MenuItem
                            iconString="Creators"
                            colorString={isCreatorsRoute ? activeColor : defaultColor}
                            sizeString="25"
                        />
                    </Link>
                    <Link href="/activity">
                        <MenuItem
                            iconString="Activity"
                            colorString={isActivityRoute ? activeColor : defaultColor}
                            sizeString="25"
                        />
                    </Link>
                    <Link href="/leaderboard">
                        <MenuItem
                            iconString="Leaderboard"
                            colorString={isLeaderboardRoute ? activeColor : defaultColor}
                            sizeString="25"
                        />
                    </Link>
                    <Link href="/ignite">
                        <MenuItem
                            iconString="Ignite"
                            colorString={isIgniteRoute ? activeColor : defaultColor}
                            sizeString="25"
                        />
                    </Link>

                    <div className="border-b lg:ml-2 mt-2 border-border/60 dark:border-white/10" />
                    <h3 className="lg:block hidden text-xs font-semibold text-muted-foreground pt-4 pb-2 px-2">
                        Suggested accounts
                    </h3>

                    <div className="lg:hidden block pt-3" />
                    <ClientOnly>
                        <div className="cursor-pointer">
                            {randomUsers?.map((user, index) => ( 
                                <MenuItemFollow key={index} user={user} /> 
                            ))}
                        </div>
                    </ClientOnly>

                    <Link
                        href="/creators#suggested"
                        className="lg:block hidden text-[color:var(--brand-accent-text)] pt-1.5 pl-2 text-[13px] font-semibold"
                    >
                        See all
                    </Link>

                    {contextUser?.user?.id ? (
                        <div >
                            <div className="border-b lg:ml-2 mt-2 border-border/60 dark:border-white/10" />
                            <h3 className="lg:block hidden text-xs font-semibold text-muted-foreground pt-4 pb-2 px-2">
                                Following accounts
                            </h3>

                            <div className="lg:hidden block pt-3" />
                            <ClientOnly>
                                <div className="cursor-pointer">
                                    {followingUsers.length > 0 ? (
                                        followingUsers.map((user, index) => ( 
                                            <MenuItemFollow key={index} user={user} /> 
                                        ))
                                    ) : (
                                        <div className="px-2 text-xs text-muted-foreground">
                                            Follow creators to see them here.
                                        </div>
                                    )}
                                </div>
                            </ClientOnly>

                            <Link
                                href="/creators#following"
                                className="lg:block hidden text-[color:var(--brand-accent-text)] pt-1.5 pl-2 text-[13px] font-semibold"
                            >
                                See more
                            </Link>
                        </div>
                    ) : null}
                    <div className="lg:block hidden border-b lg:ml-2 mt-2 border-border/60 dark:border-white/10" />

                    <div className="lg:block hidden text-[11px] text-muted-foreground">
                        <p className="pt-4 px-2">
                            About CroIgnite Newsroom Contact Careers Partners
                        </p>
                        <p className="pt-4 px-2">
                            CroIgnite for Good Advertise Developers Transparency Rewards
                        </p>
                        <p className="pt-4 px-2">
                            Help Safety Terms Privacy Creator Portal Community Guidelines
                        </p>
                        <p className="pt-4 px-2">
                            <Link
                                href="/contract-addresses"
                                className="text-[color:var(--brand-accent-text)] hover:underline"
                            >
                                Contract addresses
                            </Link>
                        </p>
                        <p className="pt-4 px-2">© 2026 CroIgnite</p>
                    </div>

                    <div className="pb-14"></div>
                </div>

            </div>
        </>
    )
}
