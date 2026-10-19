import type { Metadata } from "next";
import { ScanListView } from "@/components/shopping-list/scan-list-view";

export const metadata: Metadata = { title: "Scan a shopping list" };

export default function ScanListPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl leading-none tracking-tight sm:text-5xl">Scan a shopping list</h1>
      <p className="mt-1 text-zinc-600">Upload a photo of your list. Review it, then add everything to your cart.</p>
      <div className="mt-6">
        <ScanListView />
      </div>
    </div>
  );
}
