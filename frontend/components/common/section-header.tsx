import Link from "next/link";
import { ChevronRightIcon } from "./icons";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  /** Id for the heading, so a section can point `aria-labelledby` at it. */
  id?: string;
}

export function SectionHeader({ title, subtitle, href, linkLabel = "See all", id }: SectionHeaderProps) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="font-display text-3xl leading-none tracking-tight text-zinc-900 sm:text-4xl">
          {title}
        </h2>
        {subtitle && <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="group flex shrink-0 items-center gap-0.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          {linkLabel}
          <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
