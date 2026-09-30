import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Search, X } from "lucide-react"

/* =========================================================================
   LIST CONTAINER & ITEMS
   ========================================================================= */

const listVariants = cva("w-full transition-colors", {
  variants: {
    variant: {
      default: "space-y-2",
      bordered: "rounded-xl border border-border bg-card p-1 divide-y divide-border/60 overflow-hidden",
      compact: "rounded-lg border border-border bg-card divide-y divide-border/50 overflow-hidden",
      cards: "space-y-2.5",
      inset: "rounded-lg bg-muted/40 p-2 space-y-1.5",
      ghost: "divide-y divide-border/40",
      plain: "space-y-1",
    },
    spacing: {
      none: "gap-0",
      tight: "space-y-1",
      default: "space-y-2",
      loose: "space-y-3",
    },
  },
  defaultVariants: {
    variant: "default",
    spacing: "default",
  },
})

export interface ListProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof listVariants> {
  as?: "div" | "ul" | "ol"
}

function List({
  className,
  variant = "default",
  spacing,
  as: Component = "div",
  ...props
}: ListProps) {
  return React.createElement(Component, {
    "data-slot": "list",
    "data-variant": variant,
    className: cn(
      listVariants({
        variant,
        spacing: spacing ?? (variant === "bordered" || variant === "compact" || variant === "ghost" ? "none" : undefined),
      }),
      className
    ),
    ...props,
  })
}

const listItemVariants = cva(
  "group/list-item relative flex items-center justify-between text-sm transition-all select-none",
  {
    variants: {
      variant: {
        default:
          "rounded-lg border border-border bg-background px-3.5 py-2.5 hover:border-border/90 hover:bg-muted/30 text-foreground",
        card:
          "rounded-xl border border-border bg-card p-3.5 shadow-xs hover:border-primary/40 hover:shadow-sm text-card-foreground",
        subtle:
          "rounded-lg px-3 py-2 hover:bg-muted/60 text-foreground",
        bordered:
          "px-3.5 py-2.5 hover:bg-muted/40 text-foreground first:rounded-t-lg last:rounded-b-lg",
        compact:
          "px-3 py-2 hover:bg-muted/30 text-foreground transition-colors cursor-pointer",
        ghost:
          "py-2.5 px-1 hover:bg-muted/30 text-foreground",
        interactive:
          "rounded-lg border border-border bg-background px-3.5 py-2.5 hover:border-primary/50 hover:bg-muted/40 cursor-pointer active:scale-[0.99] text-foreground",
      },
      size: {
        xs: "py-1 px-2 text-xs min-h-[32px]",
        sm: "py-1.5 px-2.5 text-xs min-h-[36px]",
        compact: "py-2 px-3 text-xs sm:text-sm min-h-[40px]",
        default: "py-2.5 px-3.5 text-sm min-h-[46px]",
        lg: "py-3 px-4 text-base min-h-[52px]",
      },
      state: {
        idle: "",
        active: "border-primary/60 bg-primary/5 dark:bg-primary/10",
        completed: "bg-muted/20 border-border/60 opacity-75 text-muted-foreground",
        disabled: "pointer-events-none opacity-50",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      state: "idle",
    },
  }
)

export interface ListItemProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof listItemVariants> {
  as?: "div" | "li"
}

function ListItem({
  className,
  variant = "default",
  size = "default",
  state = "idle",
  as: Component = "div",
  ...props
}: ListItemProps) {
  return React.createElement(Component, {
    "data-slot": "list-item",
    "data-variant": variant,
    "data-size": size,
    "data-state": state,
    className: cn(listItemVariants({ variant, size, state }), className),
    ...props,
  })
}

function ListHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="list-header"
      className={cn(
        "flex items-center justify-between pb-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function ListTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h4
      data-slot="list-title"
      className={cn("flex items-center gap-2 font-semibold text-foreground text-sm", className)}
      {...props}
    />
  )
}

function ListPrefix({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="list-prefix"
      className={cn("flex shrink-0 items-center justify-center text-muted-foreground mr-3", className)}
      {...props}
    />
  )
}

function ListContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="list-content"
      className={cn("flex min-w-0 flex-1 flex-col gap-0.5", className)}
      {...props}
    />
  )
}

function ListText({
  className,
  completed,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { completed?: boolean }) {
  return (
    <span
      data-slot="list-text"
      className={cn(
        "text-xs sm:text-sm font-medium leading-snug break-words text-foreground transition-all",
        completed && "line-through text-muted-foreground font-normal",
        className
      )}
      {...props}
    />
  )
}

function ListDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="list-description"
      className={cn("text-xs text-muted-foreground leading-relaxed line-clamp-2", className)}
      {...props}
    />
  )
}

function ListSuffix({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="list-suffix"
      className={cn("flex shrink-0 items-center gap-1.5 ml-3 text-muted-foreground", className)}
      {...props}
    />
  )
}

function ListEmpty({
  className,
  children,
  icon,
  title = "No items found",
  description,
  action,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  icon?: React.ReactNode
  title?: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div
      data-slot="list-empty"
      className={cn(
        "flex flex-col items-center justify-center p-6 sm:p-8 rounded-xl border border-dashed border-border/80 bg-muted/10 text-center space-y-3",
        className
      )}
      {...props}
    >
      {icon && <div className="text-muted-foreground/70">{icon}</div>}
      <div className="space-y-1">
        <h5 className="text-xs sm:text-sm font-semibold text-foreground">{title}</h5>
        {description && (
          <p className="text-xs font-mono text-muted-foreground max-w-sm">{description}</p>
        )}
      </div>
      {children}
      {action && <div className="pt-1">{action}</div>}
    </div>
  )
}

/* =========================================================================
   LIST FILTER SECTION
   ========================================================================= */

const listFilterVariants = cva("w-full transition-all", {
  variants: {
    variant: {
      default: "flex flex-col gap-2.5 pb-2",
      inline: "flex flex-wrap items-center justify-between gap-2.5 pb-2",
      panel: "rounded-xl border border-border bg-card p-3.5 space-y-3 shadow-xs",
      minimal: "flex items-center gap-2 pb-1.5",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

export interface ListFilterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof listFilterVariants> {}

function ListFilter({
  className,
  variant = "default",
  ...props
}: ListFilterProps) {
  return (
    <div
      data-slot="list-filter"
      data-variant={variant}
      className={cn(listFilterVariants({ variant }), className)}
      {...props}
    />
  )
}

function ListFilterSearch({
  className,
  value,
  onChange,
  onClear,
  placeholder = "Search items...",
  ...props
}: Omit<React.ComponentProps<"input">, "onChange"> & {
  value?: string
  onChange?: (val: string) => void
  onClear?: () => void
}) {
  return (
    <div className={cn("relative flex-1 min-w-[160px]", className)}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-lg border border-input bg-background/60 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        {...props}
      />
      {value && Boolean(value.length) && (
        <button
          type="button"
          onClick={() => {
            onChange?.("")
            onClear?.()
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          title="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

function ListFilterGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="list-filter-group"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      {...props}
    />
  )
}

const listFilterChipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium font-mono transition-all cursor-pointer select-none border",
  {
    variants: {
      active: {
        true: "bg-primary text-primary-foreground border-primary shadow-xs font-semibold",
        false: "bg-background/80 hover:bg-muted/80 text-muted-foreground hover:text-foreground border-border",
      },
      size: {
        sm: "h-6 px-2 text-[11px]",
        default: "h-7 px-2.5 text-xs",
      },
    },
    defaultVariants: {
      active: false,
      size: "default",
    },
  }
)

export interface ListFilterChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof listFilterChipVariants> {
  count?: number | string
}

function ListFilterChip({
  className,
  active = false,
  size = "default",
  count,
  children,
  ...props
}: ListFilterChipProps) {
  return (
    <button
      type="button"
      data-slot="list-filter-chip"
      data-active={active}
      className={cn(listFilterChipVariants({ active, size }), className)}
      {...props}
    >
      <span>{children}</span>
      {count !== undefined && (
        <span
          className={cn(
            "ml-0.5 px-1 py-0.2 rounded-full text-[10px] leading-tight font-sans",
            active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function ListFilterCount({
  className,
  total,
  filtered,
  label = "items",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  total?: number
  filtered?: number
  label?: string
}) {
  return (
    <span
      data-slot="list-filter-count"
      className={cn("text-xs font-mono text-muted-foreground whitespace-nowrap", className)}
      {...props}
    >
      {filtered !== undefined && total !== undefined && filtered !== total
        ? `Showing ${filtered} of ${total} ${label}`
        : total !== undefined
        ? `${total} ${label}`
        : null}
    </span>
  )
}

function ListFilterActions({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="list-filter-actions"
      className={cn("flex items-center gap-1.5 shrink-0 ml-auto", className)}
      {...props}
    />
  )
}

export {
  List,
  ListItem,
  ListHeader,
  ListTitle,
  ListPrefix,
  ListContent,
  ListText,
  ListDescription,
  ListSuffix,
  ListEmpty,
  listVariants,
  listItemVariants,
  // Filter Section Components
  ListFilter,
  ListFilterSearch,
  ListFilterGroup,
  ListFilterChip,
  ListFilterCount,
  ListFilterActions,
  listFilterVariants,
  listFilterChipVariants,
}
