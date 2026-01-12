import Link from "next/link";
import { cn } from "@/lib/utils";

type EmptyStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
};

type EmptyStateProps = {
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
};

const actionClasses: Record<NonNullable<EmptyStateAction["variant"]>, string> = {
  primary:
    "bg-[color:var(--brand-accent)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-accent-strong)]",
  secondary:
    "border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10",
};

const ActionButton = ({ action }: { action: EmptyStateAction }) => {
  const className = cn(
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition",
    action.variant ? actionClasses[action.variant] : actionClasses.primary,
  );

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  );
};

export default function EmptyState({
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center py-10",
        className,
      )}
    >
      <div className="w-full max-w-[520px] rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center shadow-sm dark:border-white/10 dark:bg-black/80">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm text-gray-500 dark:text-white/60">
            {description}
          </p>
        ) : null}
        {primaryAction || secondaryAction ? (
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {primaryAction ? <ActionButton action={primaryAction} /> : null}
            {secondaryAction ? (
              <ActionButton
                action={{ ...secondaryAction, variant: "secondary" }}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
