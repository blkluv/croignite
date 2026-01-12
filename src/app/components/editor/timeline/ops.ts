export type TimelineClipBounds = {
  id: string;
  start: number;
  end: number;
};

export type TimelineSnapEdge = {
  clipId: string;
  time: number;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getDurationSeconds(clip: TimelineClipBounds) {
  const duration = clip.end - clip.start;
  return isFiniteNumber(duration) ? Math.max(0, duration) : 0;
}

export function computeRipplePlacement(params: {
  clips: TimelineClipBounds[];
  movingId: string;
  desiredStart: number;
  duration: number;
}): { start: number; end: number; shifts: Record<string, number> } {
  const { clips, movingId, desiredStart, duration } = params;
  const safeDuration = isFiniteNumber(duration) ? Math.max(0, duration) : 0;

  const others = clips
    .filter((clip) => clip.id !== movingId)
    .filter(
      (clip) =>
        isFiniteNumber(clip.start) &&
        isFiniteNumber(clip.end) &&
        clip.end > clip.start,
    )
    .sort((a, b) => a.start - b.start);

  const hit =
    others.find((clip) => desiredStart >= clip.start && desiredStart < clip.end) ??
    null;

  const start = hit ? hit.end : desiredStart;
  const end = start + safeDuration;

  const next = others.find((clip) => clip.start >= start) ?? null;
  if (!next || next.start >= end) {
    return { start, end, shifts: {} };
  }

  const delta = end - next.start;
  const shifts: Record<string, number> = {};
  for (const clip of others) {
    if (clip.start >= next.start) shifts[clip.id] = delta;
  }

  return { start, end, shifts };
}

export function findNeighborLimits(params: {
  clips: TimelineClipBounds[];
  movingId: string;
  desiredStart: number;
}): { minStart: number; maxEnd: number } {
  const { clips, movingId, desiredStart } = params;
  const others = clips
    .filter((clip) => clip.id !== movingId)
    .filter(
      (clip) =>
        isFiniteNumber(clip.start) &&
        isFiniteNumber(clip.end) &&
        clip.end > clip.start,
    )
    .sort((a, b) => a.start - b.start);

  let minStart = 0;
  let maxEnd = Number.POSITIVE_INFINITY;

  const prev = [...others].reverse().find((clip) => clip.end <= desiredStart) ?? null;
  const next = others.find((clip) => clip.start >= desiredStart) ?? null;

  if (prev) minStart = prev.end;
  if (next) maxEnd = next.start;

  return { minStart, maxEnd };
}

export function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (!Array.isArray(items) || items.length === 0) return items;
  const from = Math.max(0, Math.min(items.length - 1, Math.floor(fromIndex)));
  const next = items.slice();
  const [item] = next.splice(from, 1);
  if (typeof item === "undefined") return items;

  const insertAt = Math.max(0, Math.min(next.length, Math.floor(toIndex)));
  next.splice(insertAt, 0, item);
  return next;
}

export function findContainingClipAtTime(params: {
  clips: TimelineClipBounds[];
  time: number;
  ignoreId?: string;
}): TimelineClipBounds | null {
  const { clips, time, ignoreId } = params;
  if (!isFiniteNumber(time)) return null;
  return (
    clips
      .filter((clip) => clip.id !== ignoreId)
      .find(
        (clip) =>
          isFiniteNumber(clip.start) &&
          isFiniteNumber(clip.end) &&
          clip.end > clip.start &&
          time >= clip.start &&
          time < clip.end,
      ) ?? null
  );
}

export function buildTimelineSnapEdges(clips: TimelineClipBounds[]): TimelineSnapEdge[] {
  const edges: TimelineSnapEdge[] = [];
  for (const clip of clips) {
    if (!clip) continue;
    if (typeof clip.id !== "string" || clip.id.length === 0) continue;
    if (!isFiniteNumber(clip.start) || !isFiniteNumber(clip.end)) continue;
    if (clip.end <= clip.start) continue;
    edges.push({ clipId: clip.id, time: clip.start });
    edges.push({ clipId: clip.id, time: clip.end });
  }
  return edges;
}

export function findNearestSnapEdge(params: {
  edges: TimelineSnapEdge[];
  time: number;
  threshold: number;
  ignoreClipId?: string;
}): TimelineSnapEdge | null {
  const { edges, time, threshold, ignoreClipId } = params;
  if (!isFiniteNumber(time)) return null;
  if (!isFiniteNumber(threshold) || threshold <= 0) return null;

  let best: TimelineSnapEdge | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const edge of edges) {
    if (!edge) continue;
    if (ignoreClipId && edge.clipId === ignoreClipId) continue;
    if (!isFiniteNumber(edge.time)) continue;
    const dist = Math.abs(edge.time - time);
    if (dist <= threshold && dist < bestDist) {
      best = edge;
      bestDist = dist;
    }
  }

  return best;
}
