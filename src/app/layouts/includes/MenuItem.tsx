"use client"

import {
  AiOutlineFolderOpen,
  AiOutlineFire,
  AiOutlineHistory,
  AiOutlineHome,
  AiOutlineLineChart,
  AiOutlineTrophy,
  AiOutlineUsergroupAdd,
} from "react-icons/ai"
import { RiGroupLine } from "react-icons/ri"
import { MenuItemTypes } from "@/app/types"

export default function MenuItem({ iconString, colorString, sizeString }: MenuItemTypes) {

    const icons = () => {
        if (iconString == 'For You') return <AiOutlineHome size={sizeString} color={colorString} />
        if (iconString == 'Following') return <RiGroupLine size={sizeString} color={colorString} />
        if (iconString == 'Projects') return <AiOutlineFolderOpen size={sizeString} color={colorString} />
        if (iconString == 'Yield vault') return <AiOutlineLineChart size={sizeString} color={colorString} />
        if (iconString == 'Creators') return <AiOutlineUsergroupAdd size={sizeString} color={colorString} />
        if (iconString == 'Activity') return <AiOutlineHistory size={sizeString} color={colorString} />
        if (iconString == 'Leaderboard') return <AiOutlineTrophy size={sizeString} color={colorString} />
        if (iconString == 'Ignite') return <AiOutlineFire size={sizeString} color={colorString} />
    }

    return (
        <>
            <div className="w-full flex items-center rounded-lg p-2.5 transition-colors hover:bg-muted/60">
                <div className="flex items-center lg:mx-0 mx-auto">

                    {icons()}

                    <p
                        className="lg:block hidden pl-[9px] mt-0.5 font-semibold text-[17px]"
                        style={{ color: colorString || "inherit" }}
                    >
                        {iconString}
                    </p>
                </div>
            </div>
        </>
    )
}
