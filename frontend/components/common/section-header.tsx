import Link from "next/link";
import { ChevronRightIcon } from "./icons";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}

export function SectionHeader({ title, subtitle, href, linkLabel = "See all" }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-1 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          {linkLabel}
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
