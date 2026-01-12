"use client";

import React from "react";
import SideNavMain from "./includes/SideNavMain";
import TopNav from "./includes/TopNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
      	<>
			<div className="relative min-h-screen w-full bg-background text-foreground">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[color:var(--brand-accent-soft)] blur-3xl" />
          <div className="absolute top-1/3 -right-32 h-[380px] w-[380px] rounded-full bg-[color:var(--brand-success-soft)] blur-3xl" />
        </div>
				<TopNav />
				<SideNavMain />
				<div className="relative w-full pl-[90px] pr-4 pt-0 lg:pl-[330px]">
					{children}
				</div>
			</div>
      	</>
    )
}
  
