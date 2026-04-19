import { useCallback, useEffect, useState } from 'react';
import EncryptedStorage from 'react-native-encrypted-storage';

// A tiny FIFO queue persisted to encrypted storage so that mutations
// performed while offline (e.g. teacher marking attendance underground
// in a basement classroom) replay the next time the network is reachable.
//
// We don't ship a NetInfo dependency yet — call `flush()` manually from
// the screen after a successful unrelated request, or wire NetInfo later.

const QUEUE_KEY = 'offline_queue_v1';

export interface QueuedAction {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  payload: Record<string, unknown>;
  createdAt: number;
}

async function readQueue(): Promise<QueuedAction[]> {
  const raw = await EncryptedStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedAction[];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueuedAction[]): Promise<void> {
  await EncryptedStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export function useOfflineQueue() {
  const [size, setSize] = useState(0);

  useEffect(() => {
    readQueue().then((q) => setSize(q.length));
  }, []);

  const enqueue = useCallback(async (action: Omit<QueuedAction, 'id' | 'createdAt'>) => {
    const queue = await readQueue();
    queue.push({
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    });
    await writeQueue(queue);
    setSize(queue.length);
  }, []);

  const flush = useCallback(
    async (sender: (action: QueuedAction) => Promise<void>): Promise<{ sent: number; failed: number }> => {
      const queue = await readQueue();
      const remaining: QueuedAction[] = [];
      let sent = 0;
      let failed = 0;

      for (const action of queue) {
        try {
          await sender(action);
          sent++;
        } catch {
          remaining.push(action);
          failed++;
        }
      }

      await writeQueue(remaining);
      setSize(remaining.length);
      return { sent, failed };
    },
    [],
  );

  const clear = useCallback(async () => {
    await writeQueue([]);
    setSize(0);
  }, []);

  return { size, enqueue, flush, clear };
}
