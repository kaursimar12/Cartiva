import type { ReactNode } from "react";

/**
 * Wrapper kept for sections that used to fade in on scroll. Content now renders immediately:
 * scroll-triggered motion made the store feel restless and left blank areas until you scrolled.
 * (`delay` is accepted and ignored so existing call sites keep working.)
 */
export function Reveal({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  return <Tag className={className}>{children}</Tag>;
}
