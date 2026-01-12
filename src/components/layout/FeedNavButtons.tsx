import { BiChevronDown, BiChevronUp } from "react-icons/bi";
import { cn } from "@/lib/utils";

type FeedNavButtonsProps = {
  onPrev: () => void;
  onNext: () => void;
  disablePrev?: boolean;
  disableNext?: boolean;
  className?: string;
};

export default function FeedNavButtons({
  onPrev,
  onNext,
  disablePrev,
  disableNext,
  className,
}: FeedNavButtonsProps) {
  const baseButton =
    "flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white shadow-lg transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";
  const disabledStyles = "opacity-40 pointer-events-none";

  return (
    <div className={cn("pointer-events-auto flex flex-col gap-3", className)}>
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous clip"
        className={cn(baseButton, disablePrev && disabledStyles)}
        disabled={disablePrev}
      >
        <BiChevronUp size={26} />
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next clip"
        className={cn(baseButton, disableNext && disabledStyles)}
        disabled={disableNext}
      >
        <BiChevronDown size={26} />
      </button>
    </div>
  );
}
