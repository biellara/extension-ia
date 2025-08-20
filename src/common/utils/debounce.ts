export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait = 200
) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function (...args: A) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, wait);
  };
}