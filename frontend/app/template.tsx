import { ViewTransition, type ReactNode } from "react";

/**
 * Re-mounts on every navigation, so each page enters and the previous one exits with a short
 * fade-and-rise (styled in globals.css under "page transitions"). The header stays put.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
