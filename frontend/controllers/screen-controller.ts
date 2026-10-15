import { useScreenStore } from "@/store/screen-store";

/**
 * Keeps track of what is on the shopper's screen, so the voice agent understands
 * "the cheapest one" or "the second one" even after the shopper browsed by clicking.
 */
export const screenController = {
  /** Called by product lists whenever their visible products change (new page, filter, sort). */
  showProducts(title: string, productIds: string[]) {
    useScreenStore.setState({ path: window.location.pathname, title, productIds });
  },

  /** What is on screen right now. Empty if the shopper has since moved to a page without a list. */
  current() {
    const { path, title, productIds } = useScreenStore.getState();
    const stillThere = path === window.location.pathname;
    return {
      path: window.location.pathname,
      title: stillThere ? title : "",
      productIds: stillThere ? productIds : [],
    };
  },
};
