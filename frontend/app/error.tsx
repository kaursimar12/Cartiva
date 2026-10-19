"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { EmptyState } from "@/components/common/empty-state";

/** Fallback when a page crashes: the header, cart and voice keep working. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert">
      <EmptyState icon="⚠️" title="Something went wrong" description="This page couldn't load. Your cart is safe.">
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Try again
        </button>
      </EmptyState>
    </div>
  );
}
