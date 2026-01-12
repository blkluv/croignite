import type { ReactNode } from "react";

type VideoCardProps = {
  title: string;
  playbackUrl: string;
  meta?: ReactNode;
};

export function VideoCard({ title, playbackUrl, meta }: VideoCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <div className="border-b border-zinc-200/70 px-4 py-3 text-sm font-semibold text-zinc-900 dark:border-white/10 dark:text-white">
        {title}
      </div>
      <div className="bg-black">
        <video
          className="aspect-[9/16] w-full object-cover"
          controls
          playsInline
          src={playbackUrl}
        />
      </div>
      {meta ? (
        <div className="border-t border-zinc-200/70 px-4 py-3 text-sm text-zinc-600 dark:border-white/10 dark:text-white/70">
          {meta}
        </div>
      ) : null}
    </article>
  );
}
