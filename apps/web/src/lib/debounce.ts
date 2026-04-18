/**
 * H5 — Simple debounce utility.
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delay = 300,
): ((...args: TArgs) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: TArgs) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  (debounced as typeof debounced & { cancel: () => void }).cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return debounced as typeof debounced & { cancel: () => void };
}
