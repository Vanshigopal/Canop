import { useCallback } from "react";
import { electron, isElectron } from "@/lib/platform";

// Surface notifications using the native OS chrome when running inside
// the Electron shell. In a browser, fall back to the Notification API
// (which the user must have already permitted via a settings flow).

export function useNativeNotification() {
  const show = useCallback((title: string, body: string) => {
    if (isElectron && electron) {
      electron.showNotification(title, body);
      return;
    }
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body });
      }
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    // Electron handles permission natively — no prompt needed
    if (isElectron) return true;
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  return { show, requestPermission };
}
