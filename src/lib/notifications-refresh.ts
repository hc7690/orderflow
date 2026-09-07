/**
 * Simple event bus for notification refresh.
 * Payment actions dispatch "notifications-changed" event,
 * Header listens and re-fetches notifications.
 */

const EVENT_NAME = "notifications-changed";

/** Dispatch a notification refresh event (call after payment/order actions) */
export function notifyRefresh(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }
}

/** Subscribe to notification refresh events (returns unsubscribe function) */
export function onNotificationsChanged(callback: () => void): () => void {
  function handler() {
    callback();
  }
  if (typeof window !== "undefined") {
    window.addEventListener(EVENT_NAME, handler);
  }
  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener(EVENT_NAME, handler);
    }
  };
}
