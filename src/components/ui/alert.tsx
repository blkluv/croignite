import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-2xl border border-border bg-card px-6 py-4 text-card-foreground",
  {
    variants: {
      variant: {
        default: "",
        info: "border-border/60 bg-muted/30 text-foreground",
        success:
          "border-[color:var(--brand-success)] bg-[color:var(--brand-success-soft)] text-[color:var(--brand-success-dark)] dark:text-[color:var(--brand-success)]",
        warning:
          "border-[color:var(--brand-accent)] bg-[color:var(--brand-accent-soft)] text-[color:var(--brand-accent-text)] dark:text-[color:var(--brand-accent-strong)]",
        destructive:
          "border-[color:var(--brand-accent-strong)] bg-[color:var(--brand-accent-soft)] text-[color:var(--brand-ink)] dark:text-[color:var(--brand-accent-strong)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  ),
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-relaxed text-current break-words", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
