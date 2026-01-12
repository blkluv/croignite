"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { storeFile, useAppDispatch, useAppSelector } from "../../../../store";
import { setFilesID } from "../../../../store/slices/projectSlice";
import { cn } from "@/lib/utils";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  variant?: "button" | "dropzone";
  label?: string;
  className?: string;
};

const isSupportedMediaFile = (file: File) => {
  if (
    file.type.startsWith("video/") ||
    file.type.startsWith("audio/") ||
    file.type.startsWith("image/")
  ) {
    return true;
  }

  const name = file.name.toLowerCase();
  return /\.(mp4|mov|m4v|webm|mkv|mp3|wav|ogg|flac|aac|m4a|png|jpg|jpeg|gif|webp)$/.test(
    name,
  );
};

export default function UploadMedia({
  variant = "button",
  label = "Import",
  className,
}: Props) {
  const rawFilesID = useAppSelector((state) => state.projectState.filesID);
  const filesID = useMemo(() => rawFilesID ?? [], [rawFilesID]);
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const importFiles = useCallback(
    async (files: File[]) => {
      if (isImporting) return;

      const accepted = files.filter(isSupportedMediaFile);
      const rejected = files.length - accepted.length;

      if (accepted.length === 0) {
        toast.error("Drop videos, images, or audio files to import.");
        return;
      }

      setIsImporting(true);

      try {
        const storedIds = await Promise.all(
          accepted.map(async (file) => {
            const fileId = crypto.randomUUID();
            const stored = await storeFile(file, fileId);
            return stored ? fileId : null;
          }),
        );

        const addedIds = storedIds.filter((id): id is string => !!id);
        if (addedIds.length > 0) dispatch(setFilesID([...filesID, ...addedIds]));

        if (addedIds.length > 0) {
          toast.success(
            `Imported ${addedIds.length} file${addedIds.length === 1 ? "" : "s"}.`,
          );
        }
        if (rejected > 0) {
          toast(
            `Skipped ${rejected} unsupported file${rejected === 1 ? "" : "s"}.`,
          );
        }
      } finally {
        setIsImporting(false);
      }
    },
    [dispatch, filesID, isImporting],
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    await importFiles(selected);
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setIsDragging(false);

    const dropped = Array.from(e.dataTransfer.files || []);
    await importFiles(dropped);
  };

  const openPicker = () => inputRef.current?.click();

  if (variant === "dropzone") {
    return (
      <div
        className={cn(
          "group relative rounded-xl border border-dashed p-4 transition-colors",
          "border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30",
          isDragging ? "border-white/30 bg-white/5" : null,
          isImporting ? "opacity-60" : null,
          className,
        )}
        role="button"
        tabIndex={0}
        aria-label="Import media by dragging and dropping files"
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragEnter={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          e.stopPropagation();
          dragDepth.current += 1;
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragLeave={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          e.stopPropagation();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) {
            dragDepth.current = 0;
            setIsDragging(false);
          }
        }}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*,audio/*,image/*"
          multiple
          onChange={handleFileChange}
          className="sr-only"
        />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/40">
              <UploadCloud className="h-4 w-4 text-white/70" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">
                Drag & drop to import
              </p>
              <p className="text-xs text-white/50">
                Videos, images, and audio. Click to browse.
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              openPicker();
            }}
            disabled={isImporting}
          >
            Browse
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="video/*,audio/*,image/*"
        multiple
        onChange={handleFileChange}
        className="sr-only"
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={openPicker}
        disabled={isImporting}
      >
        <UploadCloud className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
    </div>
  );
}
