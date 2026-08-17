import * as React from "react";
import { cn } from "@/lib/utils";

/** Responsive centered page container with consistent gutters. */
export function Container({
  className,
  as: Tag = "div",
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return <Tag className={cn("container-page", className)} {...props} />;
}

/** Vertical section spacing wrapper. */
export function Section({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("py-14 sm:py-20 lg:py-24", className)} {...props}>
      {children}
    </section>
  );
}
