"use client";

import Link from "next/link";
import { useAppDispatch } from "@/app/store";
import {
  redoState,
  setActiveSection,
  undoState,
} from "@/app/store/slices/projectSlice";
import { Button } from "@/components/ui/button";
import ProjectName from "./player/ProjectName";
import { ArrowLeft, Download, Redo2, Undo2 } from "lucide-react";

export default function EditorTopBar() {
  const dispatch = useAppDispatch();

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-black/70 px-3 py-2 text-white backdrop-blur">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 hover:text-white"
          asChild
        >
          <Link href="/projects" aria-label="Back to projects">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <ProjectName compact className="max-w-[260px]" />
        <div className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 hover:text-white"
          onClick={() => dispatch(undoState())}
          aria-label="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 hover:text-white"
          onClick={() => dispatch(redoState())}
          aria-label="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => {
            dispatch(setActiveSection("export"));
          }}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>
    </div>
  );
}
