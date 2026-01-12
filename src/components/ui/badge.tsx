import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-secondary text-secondary-foreground",
        success:
          "border-[color:var(--brand-success)] bg-[color:var(--brand-success-soft)] text-[color:var(--brand-success-dark)] dark:text-[color:var(--brand-success)]",
        warning:
          "border-[color:var(--brand-accent)] bg-[color:var(--brand-accent-soft)] text-[color:var(--brand-accent-text)] dark:text-[color:var(--brand-accent-strong)]",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
