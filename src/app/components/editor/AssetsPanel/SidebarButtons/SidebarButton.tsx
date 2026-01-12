"use client";

import { cn } from "@/lib/utils";
import React from "react";

type Props = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
};

export default function SidebarButton({
  label,
  icon,
  onClick,
  active = false,
}: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg px-2 py-2 text-xs font-medium transition-colors",
        "border border-transparent",
        active
          ? "bg-white/10 text-white border-white/20 shadow-sm"
          : "text-white/70 hover:bg-white/5 hover:text-white",
      )}
      type="button"
    >
      <span className={cn("h-6 w-6", active ? "opacity-100" : "opacity-80")}>
        {icon}
      </span>
      <span className="mt-1">{label}</span>
    </button>
  );
}
