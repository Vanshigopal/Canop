import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";

/**
 * Subscribe to a Socket.io event. The handler receives the event payload.
 * Auto-cleans on unmount.
 */
export function useSocket<T = unknown>(event: string, handler: (data: T) => void): void {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const wrapped = (data: T) => ref.current(data);
    s.on(event, wrapped);
    return () => {
      s.off(event, wrapped);
    };
  }, [event]);
}
