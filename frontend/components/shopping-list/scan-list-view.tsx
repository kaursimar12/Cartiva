"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { CameraIcon, TrashIcon } from "@/components/common/icons";
import { QuantityStepper } from "@/components/products/quantity-stepper";
import { ReviewWithVoiceButton } from "@/components/voice/review-with-voice-button";
import { shoppingListController } from "@/controllers/shopping-list-controller";
import { catalogService } from "@/lib/container";
import { formatPrice } from "@/lib/format";
import type { ListLine } from "@/models/entities/shopping-list";
import { useShoppingListStore } from "@/store/shopping-list-store";

/** Upload → review (found / choose / not available) → add all to cart. */
export function ScanListView() {
  const router = useRouter();
  const { status, lines } = useShoppingListStore();
  const [newItem, setNewItem] = useState("");

  const found = lines.filter((l) => l.status === "found");
  const choose = lines.filter((l) => l.status === "choose");
  const missing = lines.filter((l) => l.status === "unavailable" || l.status === "not-found");
  const total = found.reduce((sum, l) => sum + (catalogService.getProduct(l.productId!)?.price ?? 0) * l.packs, 0);

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!newItem.trim()) return;
    shoppingListController.add(newItem.trim());
    setNewItem("");
  }

  function handleConfirm() {
    shoppingListController.confirm();
    router.push("/cart");
  }

  return (
    <div className="space-y-6">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 bg-surface p-8 text-center hover:border-brand-500">
        <CameraIcon className="h-8 w-8 text-brand-600" />
        <span className="font-semibold">{lines.length ? "Scan another photo" : "Upload or take a photo of your list"}</span>
        <span className="text-sm text-zinc-500">JPEG, PNG or WebP · up to 5 MB · handwritten is fine</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void shoppingListController.scan(file);
            e.target.value = "";
          }}
        />
      </label>

      {status.name === "scanning" && (
        <p className="flex items-center justify-center gap-2 rounded-xl bg-surface-muted py-4 text-sm font-medium" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" aria-hidden />
          Reading your list…
        </p>
      )}

      {status.name === "error" && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {status.message}
        </p>
      )}

      {status.name === "ready" && (
        <>
          <ReviewWithVoiceButton />

          <Section title={`Ready to add (${found.length})`}>
            {found.map((line) => (
              <FoundRow key={line.id} line={line} />
            ))}
            {found.length === 0 && <li className="py-3 text-sm text-zinc-500">Nothing ready yet.</li>}
          </Section>

          {choose.length > 0 && (
            <Section title={`Choose a product (${choose.length})`}>
              {choose.map((line) => (
                <ChooseRow key={line.id} line={line} />
              ))}
            </Section>
          )}

          {missing.length > 0 && (
            <Section title={`Not available (${missing.length})`}>
              {missing.map((line) => (
                <Row key={line.id} line={line}>
                  <span className="text-sm text-red-700">{line.status === "unavailable" ? "Out of stock" : "Not sold at Cartiva"}</span>
                </Row>
              ))}
            </Section>
          )}

          <form onSubmit={handleAdd} className="flex gap-2">
            <label htmlFor="add-list-item" className="sr-only">
              Add an item
            </label>
            <input
              id="add-list-item"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder='Add an item, e.g. "bread"'
              className="flex-1 rounded-xl border border-zinc-200 bg-surface px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            <button type="submit" className="rounded-xl border border-zinc-200 bg-surface px-4 text-sm font-semibold hover:bg-surface-muted">
              Add
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-surface p-4">
            <p className="text-sm">
              {found.length} item{found.length === 1 ? "" : "s"} · <strong>{formatPrice(total)}</strong>
              {choose.length > 0 && <span className="text-zinc-500"> · {choose.length} still to choose</span>}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => shoppingListController.clear()}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-surface-muted"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={found.length === 0}
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Add {found.length} to cart
              </button>
            </div>
          </div>
        </>
      )}

      {status.name === "idle" && lines.length === 0 && (
        <p className="text-center text-sm text-zinc-500">
          Prefer browsing?{" "}
          <Link href="/" className="font-semibold text-brand-700">
            Go to the shop
          </Link>
        </p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-surface px-4 sm:px-5">
      <h2 className="border-b border-zinc-100 py-3 text-sm font-semibold">{title}</h2>
      <ul className="divide-y divide-zinc-100">{children}</ul>
    </section>
  );
}

function Row({ line, children }: { line: ListLine; children: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span className="min-w-0 flex-1 text-sm">
        <span className="text-zinc-500">“{line.original}”</span>
      </span>
      {children}
      <button
        type="button"
        onClick={() => shoppingListController.remove(line.id)}
        className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
        aria-label={`Remove ${line.original}`}
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </li>
  );
}

function FoundRow({ line }: { line: ListLine }) {
  const product = catalogService.getProduct(line.productId!)!;
  return (
    <Row line={line}>
      <span className="text-sm font-medium">
        {product.name} <span className="text-zinc-500">({product.unit})</span>
        {line.limited && <span className="ml-1 text-xs text-amber-700">only {product.availableQuantity} in stock</span>}
      </span>
      <QuantityStepper
        label={product.name}
        quantity={line.packs}
        onDecrease={() =>
          line.packs > 1 ? shoppingListController.setPacks(line.id, line.packs - 1) : shoppingListController.remove(line.id)
        }
        onIncrease={() => shoppingListController.setPacks(line.id, line.packs + 1)}
        canIncrease={catalogService.remainingStock(product, line.packs) > 0}
      />
      <span className="w-16 text-right text-sm font-semibold">{formatPrice(product.price * line.packs)}</span>
    </Row>
  );
}

function ChooseRow({ line }: { line: ListLine }) {
  return (
    <Row line={line}>
      <label className="sr-only" htmlFor={`choose-${line.id}`}>
        Choose a product for {line.original}
      </label>
      <select
        id={`choose-${line.id}`}
        defaultValue=""
        onChange={(e) => shoppingListController.choose(line.id, e.target.value)}
        className="rounded-lg border border-zinc-200 bg-surface px-3 py-2 text-sm"
      >
        <option value="" disabled>
          Which one?
        </option>
        {line.options.map((id) => {
          const p = catalogService.getProduct(id);
          return p ? (
            <option key={id} value={id}>
              {p.name} ({p.unit}) · {formatPrice(p.price)}
            </option>
          ) : null;
        })}
      </select>
    </Row>
  );
}
