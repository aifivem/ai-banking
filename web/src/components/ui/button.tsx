import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { cn } from "../../lib/utils";

/** TGIANN pill buttons (docs/design.md): filled green primary (one per view), grey secondary, red destructive, round icon. */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-[0.8vh] rounded-full px-[2vh] whitespace-nowrap transition-[background-color,color,transform] duration-150 ease-out enabled:active:[transform:scale(0.97)] disabled:cursor-not-allowed disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "bg-tgi-green font-bold text-tgi-green-text enabled:hover:bg-tgi-green-hover",
        secondary: "bg-control font-semibold text-white enabled:hover:bg-control-hover",
        grey: "bg-white/6 font-semibold text-text-3 enabled:hover:bg-white/12 enabled:hover:text-white",
        destructive: "bg-danger-solid font-bold text-white enabled:hover:bg-danger",
        icon: "size-[4vh] bg-control px-0 text-[1.6vh] text-text-3 enabled:hover:bg-control-hover enabled:hover:text-white enabled:active:[transform:scale(0.92)]",
      },
      size: {
        md: "h-[4.4vh] text-[1.5vh]",
        sm: "h-[3.6vh] text-[1.3vh]",
      },
    },
    compoundVariants: [{ variant: "icon", className: "h-[4vh]" }],
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  /** Shows a spinner next to the label and disables the button while an action runs. */
  busy?: boolean;
}

export function Button({ className, variant, size, busy = false, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      data-slot="button"
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {busy && <FontAwesomeIcon icon={faSpinner} spin data-icon="inline-start" />}
      {children}
    </button>
  );
}
