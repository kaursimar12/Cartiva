import Link from "next/link";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  children?: ReactNode;
}

export function EmptyState({ icon, title, description, action, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-zinc-200 bg-surface px-6 py-14 shadow-sm text-center">
      <span className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100 text-5xl" aria-hidden>
        {icon}
      </span>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-zinc-600">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-6 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {action.label}
        </Link>
      )}
      {children}
    </div>
  );
}
