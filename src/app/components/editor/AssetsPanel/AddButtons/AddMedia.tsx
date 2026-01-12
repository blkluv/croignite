"use client";

import { getFile, useAppDispatch, useAppSelector } from "../../../../store";
import { setMediaFiles, setTracks } from "../../../../store/slices/projectSlice";
import { categorizeFile } from "../../../../utils/utils";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { createMediaFileFromFile } from "@/lib/media/ingest";
import type { TimelineTrack } from "@/app/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  fileId: string;
  variant?: "icon" | "button";
  label?: string;
  className?: string;
};

export default function AddMedia({
  fileId,
  variant = "icon",
  label = "Add",
  className,
}: Props) {
  const { mediaFiles, resolution, tracks } = useAppSelector(
    (state) => state.projectState,
  );
  const dispatch = useAppDispatch();

  const handleFileChange = async () => {
    const updatedMedia = [...mediaFiles];

    const file = await getFile(fileId);
    if (!file) {
      toast.error("File not found.");
      return;
    }

    if (fileId) {
      const type = categorizeFile(file.type);
      const baseTrackId = tracks[0]?.id ?? null;
      const overlayTrackId = tracks[1]?.id ?? baseTrackId;

      const ensureAudioTrackId = () => {
        const existing = mediaFiles.find(
          (clip) => clip.type === "audio" && typeof clip.trackId === "string",
        )?.trackId;
        if (existing) return existing;
        const third = tracks[2]?.id;
        if (third) return third;
        const nextId = crypto.randomUUID();
        const nextTrack: TimelineTrack = {
          id: nextId,
          kind: "layer",
          name: `Layer ${tracks.length + 1}`,
        };
        dispatch(
          setTracks([...tracks, nextTrack]),
        );
        return nextId;
      };

      const targetTrackId =
        type === "audio"
          ? ensureAudioTrackId()
          : type === "image"
            ? overlayTrackId
            : baseTrackId;

      const relevantClips = mediaFiles.filter(
        (clip) => (clip.trackId ?? null) === targetTrackId,
      );
      const lastEnd =
        relevantClips.length > 0
          ? Math.max(...relevantClips.map((f) => f.positionEnd))
          : 0;

      const src = URL.createObjectURL(file);
      const defaultDurationSeconds = type === "image" ? 5 : 30;
      const mediaClip = await createMediaFileFromFile({
        file,
        fileId,
        src,
        positionStart: lastEnd,
        frame: {
          width: resolution?.width ?? 1920,
          height: resolution?.height ?? 1080,
        },
        trackId: targetTrackId ?? undefined,
        defaultDurationSeconds,
      });

      updatedMedia.push(mediaClip);
    }
    dispatch(setMediaFiles(updatedMedia));
    toast.success("Media added successfully.");
  };

  return (
    <Button
      type="button"
      size={variant === "icon" ? "icon" : "sm"}
      variant={variant === "icon" ? "ghost" : "secondary"}
      onClick={handleFileChange}
      className={cn(
        variant === "icon"
          ? "h-9 w-9 rounded-full bg-black/40 text-white hover:bg-black/60"
          : null,
        className,
      )}
      aria-label="Add media to timeline"
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      {variant === "button" ? label : null}
    </Button>
  );
}
