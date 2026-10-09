import { create } from "zustand";

export type ToastTone = "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: Toast[];
}

export const useToastStore = create<ToastState>()(() => ({ toasts: [] }));

let nextId = 1;

export function showToast(message: string, tone: ToastTone = "info"): void {
  const id = nextId++;
  useToastStore.setState((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, tone }] }));
  setTimeout(() => dismissToast(id), 3000);
}

export function dismissToast(id: number): void {
  useToastStore.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
}
