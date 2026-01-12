import type { ProjectState, TextElement, TimelineMarker } from "@/app/types";

export type BoostPassPack = {
  id: string;
  name: string;
  version: string;
  textElements?: Array<
    Omit<TextElement, "id" | "trackId" | "includeInMerge" | "visible"> & {
      includeInMerge?: boolean;
    }
  >;
  markers?: Array<Omit<TimelineMarker, "id">>;
  notes?: string[];
};

const calculateDuration = (mediaFiles: ProjectState["mediaFiles"], text: TextElement[]) => {
  const mediaEnd = mediaFiles.map((item) => item.positionEnd);
  const textEnd = text.map((item) => item.positionEnd);
  return Math.max(0, ...mediaEnd, ...textEnd);
};

export const applyBoostPassPack = (
  project: ProjectState,
  pack: BoostPassPack,
): ProjectState => {
  const now = new Date().toISOString();
  const trackId = project.tracks[0]?.id;
  const baseIndex = project.textElements.length;

  const packText = (pack.textElements ?? []).filter(
    (element) =>
      typeof element.text === "string" &&
      Number.isFinite(element.positionStart) &&
      Number.isFinite(element.positionEnd),
  );

  const nextTextElements = [
    ...project.textElements,
    ...packText.map((element, index) => {
      const start = Math.max(0, element.positionStart);
      const end = Math.max(start + 0.5, element.positionEnd);
      return {
        ...element,
        id: crypto.randomUUID(),
        positionStart: start,
        positionEnd: end,
        trackId,
        includeInMerge: element.includeInMerge ?? true,
        zIndex: element.zIndex ?? baseIndex + index + 1,
      };
    }),
  ];

  const packMarkers = (pack.markers ?? []).filter(
    (marker) => Number.isFinite(marker.time),
  );
  const nextMarkers = [
    ...project.markers,
    ...packMarkers.map((marker) => ({
      id: crypto.randomUUID(),
      time: Math.max(0, marker.time),
      label: marker.label,
      color: marker.color,
    })),
  ];

  return {
    ...project,
    textElements: nextTextElements,
    markers: nextMarkers,
    lastModified: now,
    duration: calculateDuration(project.mediaFiles, nextTextElements),
  };
};
