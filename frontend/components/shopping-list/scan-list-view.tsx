"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CameraIcon, TrashIcon } from "@/components/common/icons";
import { ProductImage } from "@/components/products/product-image";
import { QuantityStepper } from "@/components/products/quantity-stepper";
import { ReviewWithVoiceButton } from "@/components/voice/review-with-voice-button";
import { shoppingListController } from "@/controllers/shopping-list-controller";
import { useVoiceSession } from "@/hooks/use-voice-session";
import { catalogService } from "@/lib/container";
import { formatPrice } from "@/lib/format";
import type { ListLine } from "@/models/entities/shopping-list";
import { useShoppingListStore } from "@/store/shopping-list-store";

/** Upload → review (found / choose / not available) → add all to cart. */
export function ScanListView() {
  const router = useRouter();
  const { status, lines } = useShoppingListStore();
  const [newItem, setNewItem] = useState("");
  const voice = useVoiceSession();

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
            if (!file) return;
            // Start Cartiva in the same tap (browsers only allow mic + audio from a tap), so it can
            // greet while the photo is read, then go through the list out loud.
            void voice.start();
            void shoppingListController.scan(file);
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
              {choose.map((line, i) => (
                // Cartiva asks about these in order, so while it's on the call the first one is "being asked".
                <ChooseRow key={line.id} line={line} asking={voice.active && i === 0} />
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
              className="flex-1 rounded-xl border border-hairline bg-surface px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            <button type="submit" className="rounded-xl border border-hairline bg-surface px-4 text-sm font-semibold hover:bg-surface-muted">
              Add
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface p-4">
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
                className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
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
    <section className="rounded-2xl border border-hairline bg-surface px-4 sm:px-5">
      <h2 className="border-b border-zinc-100 py-3 text-sm font-semibold">{title}</h2>
      <ul className="divide-y divide-hairline">{children}</ul>
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

/**
 * An item that needs a choice: its options as tappable cards (answer by tap or by voice).
 * While Cartiva is asking about it, it lights up and scrolls into view.
 */
function ChooseRow({ line, asking }: { line: ListLine; asking: boolean }) {
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (asking) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [asking]);

  return (
    <li
      ref={ref}
      className={`-mx-2 my-1 rounded-2xl px-2 py-3 transition-[background-color,box-shadow] duration-500 ${
        asking ? "glow-brand bg-brand-500/5" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 text-sm">
          <span className="text-zinc-500">“{line.original}”</span>
          {asking ? (
            <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />
              Cartiva is asking: which one?
            </span>
          ) : (
            <span className="ml-2 text-xs text-zinc-500">Which one?</span>
          )}
        </span>
        <button
          type="button"
          onClick={() => shoppingListController.remove(line.id)}
          className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
          aria-label={`Remove ${line.original}`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
      <div role="radiogroup" aria-label={`Choose a product for ${line.original}`} className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {line.options.map((id, i) => {
          const p = catalogService.getProduct(id);
          if (!p) return null;
          return (
            <motion.button
              key={id}
              type="button"
              role="radio"
              aria-checked={false}
              onClick={() => shoppingListController.choose(line.id, id)}
              initial={asking ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: asking ? i * 0.06 : 0 }}
              whileTap={{ scale: 0.97 }}
              className={`flex items-center gap-3 rounded-xl border p-2 text-left transition-colors hover:border-brand-500 hover:bg-brand-500/5 ${
                asking ? "border-brand-500/40 bg-surface" : "border-hairline bg-surface"
              }`}
            >
              <ProductImage product={p} size="sm" />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-sm font-medium text-zinc-900">{p.name}</span>
                <span className="tabular block text-xs text-zinc-500">
                  {p.unit} · {formatPrice(p.price)}
                </span>
              </span>
              <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[11px] font-semibold text-zinc-600">
                {i + 1}
              </span>
            </motion.button>
          );
        })}
      </div>
    </li>
  );
}
