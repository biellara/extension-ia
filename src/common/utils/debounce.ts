export function debounce<T extends (...args: any[]) => void>(fn: T, ms = 350) {
  let t: number | undefined;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    // @ts-ignore (compat TS + Node typings)
    t = setTimeout(() => fn(...args), ms);
  };
}