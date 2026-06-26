import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:shadow-glow hover:-translate-y-0.5",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 hover:-translate-y-0.5",
        outline:
          "border border-border bg-transparent hover:bg-secondary hover:text-secondary-foreground hover:border-primary/30 hover:-translate-y-0.5",
        secondary:
          "bg-secondary text-secondary-foreground shadow-md hover:bg-secondary/80 hover:-translate-y-0.5",
        ghost:
          "hover:bg-secondary hover:text-secondary-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        hero:
          "bg-gradient-to-r from-primary via-amber-500 to-primary bg-[length:200%_100%] text-primary-foreground shadow-lg hover:shadow-glow-lg hover:scale-[1.03] hover:bg-[position:100%_0] active:scale-[0.98] transition-all duration-500",
        glass:
          "bg-card/50 backdrop-blur-md border border-border/50 text-foreground hover:bg-card/70 hover:border-primary/30 hover:-translate-y-0.5",
        success:
          "bg-success text-success-foreground shadow-md hover:bg-success/90 hover:-translate-y-0.5",
        premium:
          "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 bg-[length:200%_100%] text-black font-bold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.03] hover:bg-[position:100%_0] active:scale-[0.98] transition-all duration-500",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-3.5",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
