/**
 * Result shape shared by every application action.
 * The manual UI and (later) the voice agent consume the same results,
 * so `message` is written to be shown or spoken as-is.
 */
export type ActionErrorCode =
  | "NOT_FOUND"
  | "NOT_IN_CART"
  | "OUT_OF_STOCK"
  | "PARTIAL_STOCK"
  | "INVALID_QUANTITY"
  | "EMPTY_CART"
  | "PAYMENT_FAILED";

export interface ActionError {
  code: ActionErrorCode;
  message: string;
  /** For PARTIAL_STOCK: how many more units can still be added. */
  available?: number;
}

export type ActionResult<T> =
  | { ok: true; data: T; message: string }
  | { ok: false; error: ActionError };
