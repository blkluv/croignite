import React from "react"
import TopNav from "./includes/TopNav"

export default function UploadLayout({ children }: { children: React.ReactNode }) {
	return (
      	<>
			<div className="relative min-h-screen bg-background text-foreground">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-[color:var(--brand-accent-soft)] blur-3xl" />
          <div className="absolute top-1/3 -right-32 h-[320px] w-[320px] rounded-full bg-[color:var(--brand-success-soft)] blur-3xl" />
        </div>
        <TopNav/>
        <div className="relative flex justify-between mx-auto w-full px-2 max-w-[1140px]">
          {children}
        </div>
      </div>
      	</>
    )
}
  
