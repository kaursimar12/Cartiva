"use client";

import { useSessionContext } from "@livekit/components-react";
import { useEffect } from "react";
import { formatPrice } from "@/lib/format";
import { notifyAgent } from "@/lib/voice/rpc";
import { useCheckoutStore } from "@/store/checkout-store";
import { useOrderStore } from "@/store/order-store";

/**
 * Invisible: tells the voice agent about every payment, however it was started (spoken "yes" or the
 * Pay button) — "payment.started" so it doesn't hang up while the shopper types card details, then
 * "payment.result" so it announces the outcome. Notifying is a no-op when no call is running.
 */
export function VoicePaymentAnnouncer() {
  const session = useSessionContext();

  useEffect(
    () =>
      useCheckoutStore.subscribe((state, before) => {
        const now = state.status;
        if (now.name === before.status.name) return;
        if (now.name === "processing") {
          notifyAgent(session.room, "payment.started", {});
        } else if (now.name === "success") {
          const order = useOrderStore.getState().lastOrder;
          notifyAgent(session.room, "payment.result", {
            ok: true,
            orderId: order?.id,
            total: order ? formatPrice(order.pricing.total) : undefined,
          });
        } else if (now.name === "failed") {
          notifyAgent(session.room, "payment.result", { ok: false, reason: now.reason });
        }
      }),
    [session.room],
  );

  return null;
}
