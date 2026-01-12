"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { FiVolume, FiVolume1, FiVolume2, FiVolumeX } from "react-icons/fi";
import Image from "next/image";
import { useGeneralStore } from "@/app/stores/general";
import { cn } from "@/lib/utils";
import { VideoStatusOverlay } from "./VideoStatusOverlay";

type ClipVideoMeta = {
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
};

type ClipVideoPlayerProps = {
  src: string;
  className?: string;
  videoClassName?: string;
  autoPlay?: boolean;
  loop?: boolean;
  observeVisibility?: boolean;
  showLogo?: boolean;
  logoClassName?: string;
  meta?: ClipVideoMeta;
  showMeta?: boolean;
  onEnded?: () => void;
};

const DEFAULT_VOLUME = 0.75;

export function ClipVideoPlayer({
  src,
  className,
  videoClassName,
  autoPlay = false,
  loop = true,
  observeVisibility = false,
  showLogo = true,
  logoClassName,
  meta,
  showMeta = true,
  onEnded,
}: ClipVideoPlayerProps) {
  const { feedVolume, setFeedVolume } = useGeneralStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pauseIntentRef = useRef<"auto" | "user" | null>(null);
  const userPausedRef = useRef(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isVisible, setIsVisible] = useState(() => !observeVisibility);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isVolumeDragging, setIsVolumeDragging] = useState(false);

  const safePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const playPromise = video.play();
    if (!playPromise) return;
    playPromise.catch(async (error) => {
      if (error?.name === "AbortError") return;

      if (error?.name === "NotAllowedError") {
        // Autoplay with sound is blocked; keep audio enabled and let the user tap to play.
        userPausedRef.current = true;
        setIsPaused(true);
        setIsBuffering(false);
        return;
      }

      console.warn(error);
    });
  }, [setFeedVolume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = feedVolume;
    video.muted = feedVolume === 0;
  }, [feedVolume]);

  useEffect(() => {
    setIsVisible(!observeVisibility);
  }, [observeVisibility]);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!observeVisibility || !video || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const ratio = entry?.intersectionRatio ?? 0;
        const nextVisible = ratio >= 0.6;
        setIsVisible(nextVisible);

        if (!nextVisible) {
          if (!video.paused) {
            pauseIntentRef.current = "auto";
            video.pause();
          }
          return;
        }

        if (!userPausedRef.current) {
          safePlay();
        }
      },
      { threshold: [0.6] },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [observeVisibility, safePlay]);

  const shouldAutoplay = autoPlay || (observeVisibility && isVisible);
  const shouldPlay = shouldAutoplay && !userPausedRef.current;
  const isAutoplayContext = autoPlay || observeVisibility;

  useEffect(() => {
    if (!shouldPlay) return;
    safePlay();
  }, [safePlay, shouldPlay]);

  useEffect(() => {
    setIsBuffering(true);
    setIsPaused(false);
    setHasPlayed(false);
    setDuration(0);
    setCurrentTime(0);
    pauseIntentRef.current = null;
    userPausedRef.current = false;
  }, [src]);

  useEffect(() => {
    if (!isVolumeDragging) return;
    const handlePointerUp = () => setIsVolumeDragging(false);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isVolumeDragging]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      userPausedRef.current = false;
      safePlay();
      return;
    }
    pauseIntentRef.current = "user";
    video.pause();
  };

  const handleKeyToggle = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      togglePlayback();
    }
  };

  const handleTimeUpdate = () => {
    if (isSeeking) return;
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
    setCurrentTime(video.currentTime || 0);
  };

  const handleSeekChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const nextTime = Number(event.target.value);
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleSeekStart = (event: PointerEvent<HTMLInputElement>) => {
    event.stopPropagation();
    setIsSeeking(true);
  };

  const handleSeekEnd = (event: PointerEvent<HTMLInputElement>) => {
    event.stopPropagation();
    setIsSeeking(false);
  };

  const handleVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const value = Number(event.target.value) / 100;
    setFeedVolume(Number.isFinite(value) ? value : DEFAULT_VOLUME);
  };

  const handleVolumePointerDown = (event: PointerEvent<HTMLInputElement>) => {
    event.stopPropagation();
    setIsVolumeDragging(true);
  };

  const showPausedOverlay = isPaused && userPausedRef.current;
  const showLoadingOverlay =
    isBuffering || (isAutoplayContext && shouldPlay && (isPaused || !hasPlayed));
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const volumeIcon = useMemo(() => {
    if (feedVolume <= 0) return FiVolumeX;
    if (feedVolume < 0.33) return FiVolume;
    if (feedVolume < 0.66) return FiVolume1;
    return FiVolume2;
  }, [feedVolume]);

  const VolumeIcon = volumeIcon;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-visible",
        className,
      )}
      onClick={togglePlayback}
      onKeyDown={handleKeyToggle}
      role="button"
      tabIndex={0}
      aria-label="Toggle playback"
    >
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-black">
        <video
          ref={videoRef}
          loop={loop}
          playsInline
          autoPlay={autoPlay}
          muted={feedVolume === 0}
          preload={observeVisibility ? "metadata" : "auto"}
          className={cn("h-full w-full object-contain", videoClassName)}
          src={src}
          onPlay={() => {
            userPausedRef.current = false;
            setHasPlayed(true);
            setIsPaused(false);
          }}
          onPause={() => {
            setIsPaused(true);
            const intent = pauseIntentRef.current;
            pauseIntentRef.current = null;

            if (intent === "user") {
              userPausedRef.current = true;
              return;
            }

            if (!intent && shouldPlay) {
              safePlay();
            }
          }}
          onLoadStart={() => setIsBuffering(true)}
          onWaiting={() => setIsBuffering(true)}
          onStalled={() => setIsBuffering(true)}
          onCanPlay={() => {
            setIsBuffering(false);
            if (shouldPlay) {
              safePlay();
            }
          }}
          onPlaying={() => {
            setIsBuffering(false);
            setIsPaused(false);
            setHasPlayed(true);
          }}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            if (onEnded) onEnded();
          }}
        />

        <VideoStatusOverlay
          isBuffering={showLoadingOverlay}
          isPaused={showPausedOverlay}
        />

        {meta && showMeta ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
            <div
              className="pointer-events-auto bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4 pb-6 pt-10 text-white"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="max-w-[72%] space-y-1 text-left drop-shadow">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  {meta.title}
                  {meta.badge}
                </div>
                {meta.description ? (
                  <p className="line-clamp-2 text-xs text-white/85">
                    {meta.description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div
          className="absolute left-3 top-3 z-20"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="group/volume relative">
            <div className="flex items-center justify-center rounded-full bg-black/50 p-1.5 text-white">
              <button
                type="button"
                aria-label="Adjust volume"
                className="inline-flex h-8 w-8 items-center justify-center"
                onClick={(event) => event.stopPropagation()}
              >
                <VolumeIcon size={18} />
              </button>
            </div>
            <div
              className={cn(
                "pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 opacity-0 transition",
                "group-hover/volume:pointer-events-auto group-hover/volume:opacity-100",
                "group-focus-within/volume:pointer-events-auto group-focus-within/volume:opacity-100",
                isVolumeDragging && "pointer-events-auto opacity-100",
              )}
            >
              <div className="flex h-8 items-center rounded-full bg-black/70 px-3 text-white shadow-lg">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(feedVolume * 100)}
                  onChange={handleVolumeChange}
                  onPointerDown={handleVolumePointerDown}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                  aria-label="Volume"
                  className="clip-slider h-1 w-24 cursor-pointer rounded-full"
                  style={{
                    background: `linear-gradient(to right, #ffffff ${
                      feedVolume * 100
                    }%, rgba(255,255,255,0.2) ${feedVolume * 100}%)`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {showLogo ? (
          <Image
            className={cn("absolute right-2 bottom-10 w-[84px]", logoClassName)}
            src="/images/croignite-logo.png"
            alt="CroIgnite"
            width={84}
            height={84}
            sizes="84px"
          />
        ) : null}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 translate-y-full px-3">
        <div className="rounded-full bg-black/60 px-3 py-2 shadow-lg backdrop-blur">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeekChange}
            onPointerDown={handleSeekStart}
            onPointerUp={handleSeekEnd}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            aria-label="Playback position"
            className="clip-slider h-1 w-full cursor-pointer rounded-full"
            style={{
              background: `linear-gradient(to right, var(--clip-slider-fill) ${progress}%, var(--clip-slider-track) ${progress}%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
