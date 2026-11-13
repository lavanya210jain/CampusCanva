import { useEffect, useLayoutEffect, useRef } from "react";

const dialogStack: HTMLElement[] = [];

// Keep keyboard focus inside a dialog and return it to its trigger on close.
export function useDialog(open: boolean, onClose: () => void) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const container = root.current;
    if (!container) return;
    dialogStack.push(container);
    const previous = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      Array.from(
        root.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
        ) || [],
      ).filter((e) => e.getClientRects().length > 0);
    focusables()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (dialogStack.at(-1) !== container) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
      if (event.key !== "Tab") return;
      const items = focusables(),
        first = items[0],
        last = items.at(-1);
      if (!first) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !root.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !root.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      const index = dialogStack.indexOf(container);
      if (index >= 0) dialogStack.splice(index, 1);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = originalOverflow;
      previous?.focus();
    };
  }, [open]);
  return root;
}
