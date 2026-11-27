import type { Metadata } from "next";
import Link from "next/link";
import { DELIVERY_AREAS } from "@/lib/delivery-areas";
import { pricingService } from "@/lib/container";
import { formatPrice } from "@/lib/format";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Help" };

/** Answers to the questions shoppers actually ask, taken from how the store works. */
export default function HelpPage() {
  const { fee, freeAbove } = pricingService.delivery;

  const sections = [
    {
      id: "delivery",
      title: "Delivery",
      items: [
        {
          q: "How long does delivery take?",
          a: `Most orders arrive in about ${brand.deliveryTime}, packed when you order.`,
        },
        {
          q: "How much is delivery?",
          a: `Free on orders above ${formatPrice(freeAbove)}. Smaller orders have a ${formatPrice(fee)} delivery fee, shown in your bill before you pay.`,
        },
        {
          q: "Where do you deliver?",
          a: `We currently deliver to ${DELIVERY_AREAS.join(", ")}. Pick your area from the top of the page.`,
        },
      ],
    },
    {
      id: "offers",
      title: "Offers and prices",
      items: [
        {
          q: "Do I need a coupon code?",
          a: "No. Every offer is applied automatically at checkout, and your bill shows each discount.",
        },
        {
          q: "Can offers be combined?",
          a: `Yes. A product deal (for example ${brand.dealExample}) and a category or whole-order offer can apply to the same order.`,
        },
        {
          q: "Are prices inclusive of taxes?",
          a: "Yes, all prices include taxes.",
        },
      ],
    },
    {
      id: "payments",
      title: "Payments",
      items: [
        {
          q: "How can I pay?",
          a: "UPI, cards, netbanking and wallets through Razorpay. Your payment is verified on our server before the order is placed.",
        },
        {
          q: "My payment failed. Was I charged?",
          a: "No. If a payment fails, nothing is charged and your cart is kept, so you can try again with another method.",
        },
      ],
    },
    {
      id: "voice",
      title: "Shopping by voice",
      items: [
        {
          q: "How do I shop by voice?",
          a: `Tap “Ask ${brand.assistant.name}” at the top, allow the microphone, and say what you need, for example ${brand.voiceExamples[0]} or “Show me today’s offers”.`,
        },
        {
          q: "Which languages does it understand?",
          a: "English, Hindi and Hinglish. It replies in the language you speak.",
        },
        {
          q: "Can the assistant pay without asking me?",
          a: "No. It reads out your total and only starts the payment after you clearly say yes.",
        },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl leading-tight sm:text-4xl">Help</h1>
      <p className="mt-1 text-zinc-600">Delivery, offers, payments and shopping by voice.</p>

      <nav aria-label="Help topics" className="mt-6 flex flex-wrap gap-2">
        {sections.map((s) => (
          <Link
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-hairline bg-surface px-4 py-1.5 text-sm font-medium text-zinc-700 hover:border-zinc-300"
          >
            {s.title}
          </Link>
        ))}
      </nav>

      <div className="mt-10 space-y-10">
        {sections.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-heading`} className="scroll-mt-40">
            <h2 id={`${s.id}-heading`} className="font-display text-2xl leading-tight">
              {s.title}
            </h2>
            <dl className="mt-4 divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
              {s.items.map((item) => (
                <div key={item.q} className="px-5 py-4">
                  <dt className="font-medium text-zinc-900">{item.q}</dt>
                  <dd className="mt-1 text-sm text-zinc-600">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
