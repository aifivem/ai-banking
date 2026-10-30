import type { ComponentProps } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons"
import { cn } from "../../lib/utils"

interface InputProps extends ComponentProps<"input"> {
  /** Glyph at the right end of the pill. */
  icon?: IconDefinition
}

/** TGIANN pill input: the wrapper carries the frame and shows focus (focus-within), the field itself has none. */
export function Input({ className, icon, ...props }: InputProps) {
  return (
    <label
      data-slot="input"
      className={cn(
        "flex h-[4.4vh] w-full min-w-0 cursor-text items-center gap-[1vh] rounded-full border border-white/8 bg-[#2222224D] px-[1.6vh] transition-colors duration-150 focus-within:border-tgi-green-40 hover:border-white/14 has-[[aria-invalid=true]]:border-danger",
        className
      )}
    >
      <input
        className="h-full w-full min-w-0 bg-transparent text-[1.4vh] text-text-2 tabular-nums outline-none placeholder:text-text-4 focus:text-white"
        {...props}
      />
      {icon && (
        <FontAwesomeIcon
          icon={icon}
          className="shrink-0 text-[1.4vh] text-text-3"
        />
      )}
    </label>
  )
}
