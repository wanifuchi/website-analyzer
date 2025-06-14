import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const cardVariants = cva(
  "rounded-xl bg-white text-card-foreground transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border border-gray-200 shadow-sm",
        elevated: "shadow-lg border-0",
        outlined: "border-2 border-gray-200 shadow-none",
        ghost: "border-0 shadow-none bg-transparent",
      },
      padding: {
        none: "",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
      hoverable: {
        true: "hover:shadow-xl hover:-translate-y-1 cursor-pointer",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
      hoverable: false,
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  title?: string
  subtitle?: string
  action?: React.ReactNode
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, hoverable, title, subtitle, action, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, hoverable, className }))}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between mb-6">
          <div className="space-y-1">
            {title && (
              <h3 className="text-lg font-semibold leading-none tracking-tight text-gray-900">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600">{subtitle}</p>
            )}
          </div>
          {action && (
            <div className="flex-shrink-0 ml-4">{action}</div>
          )}
        </div>
      )}
      {children}
    </div>
  )
)

export default Card;