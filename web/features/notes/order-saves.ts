import type { QueryClient } from "@tanstack/react-query";

/**
 * Saves of a new order of notes or tags. They run one after another (their
 * mutations share a scope), and sync pulls of notes and tags wait while one
 * is on its way, so a quick second drop never snaps back to the first.
 */
export const ORDER_SAVE_KEY = ["order-save"];

/** For a mutation that saves an order: one at a time, in the order made. */
export const orderSaveOptions = (scope: "notes" | "tags") => ({
  mutationKey: ORDER_SAVE_KEY,
  scope: { id: `order-${scope}` },
});

/**
 * Once the last order save settles, the lists are pulled again, so they
 * show what the server has (and an order that failed to save goes back);
 * both notes and tags, since pulls of either waited.
 */
export function pullAfterLastOrderSave(queryClient: QueryClient) {
  if (queryClient.isMutating({ mutationKey: ORDER_SAVE_KEY }) > 1) return;
  void queryClient.invalidateQueries({ queryKey: ["notes"] });
  void queryClient.invalidateQueries({ queryKey: ["tags"] });
}
