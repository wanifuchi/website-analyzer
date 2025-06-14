import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gray-900 text-gray-50 shadow hover:bg-gray-900/80",
        secondary: "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80",
        destructive: "border-transparent bg-red-500 text-gray-50 shadow hover:bg-red-500/80",
        outline: "text-gray-950 border-gray-200",
        success: "border-transparent bg-green-100 text-green-800 shadow-sm",
        warning: "border-transparent bg-yellow-100 text-yellow-800 shadow-sm",
        error: "border-transparent bg-red-100 text-red-800 shadow-sm",
        info: "border-transparent bg-blue-100 text-blue-800 shadow-sm",
        neutral: "border-transparent bg-gray-100 text-gray-800 shadow-sm",
      },
      size: {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-2.5 py-1",
        lg: "text-base px-3 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function Badge({ className, variant, size, dot = false, children, ...props }: BadgeProps) {
  const dotColors = {
    default: 'bg-gray-500',
    secondary: 'bg-gray-400',
    destructive: 'bg-red-400',
    outline: 'bg-gray-400',
    success: 'bg-green-400',
    warning: 'bg-yellow-400',
    error: 'bg-red-400',
    info: 'bg-blue-400',
    neutral: 'bg-gray-400'
  };

  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", dotColors[variant || 'default'])}></span>
      )}
      {children}
    </div>
  )
}

export default Badge;