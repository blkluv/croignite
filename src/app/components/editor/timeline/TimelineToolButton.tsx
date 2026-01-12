"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  tooltip: string;
  helpTitle: string;
  help: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  infoLabel?: string;
};

export function TimelineToolButton({
  icon,
  label,
  shortcut,
  tooltip,
  helpTitle,
  help,
  onClick,
  disabled,
  className,
  infoLabel,
}: Props) {
  return (
    <div className="group relative inline-flex items-center">
      <TooltipProvider delayDuration={250}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={onClick}
              className={cn(
                "h-9 justify-start gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-white/85 hover:bg-white/10 hover:text-white",
                "focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-0",
                className,
              )}
              aria-label={label}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center">
                {icon}
              </span>
              <span className="hidden sm:inline">{label}</span>
              {shortcut ? (
                <kbd className="ml-0.5 hidden rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-white/70 sm:inline">
                  {shortcut}
                </kbd>
              ) : null}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" align="center" className="max-w-[320px]">
            <div className="text-xs font-semibold text-popover-foreground">
              {label}
              {shortcut ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  ({shortcut})
                </span>
              ) : null}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{tooltip}</div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className={cn(
              "absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full",
              "border border-white/10 bg-[#1E1D21]/90 text-white/60 shadow-sm backdrop-blur",
              "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-0",
            )}
            aria-label={infoLabel ?? `${label} help`}
            onClick={(e) => e.stopPropagation()}
          >
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{helpTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            {help}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

