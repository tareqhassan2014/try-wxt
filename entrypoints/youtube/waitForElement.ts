export interface WaitForElementOptions {
  timeout?: number;
  root?: Document;
}

export function waitForElement(
  selector: string,
  { timeout = 10000, root = document }: WaitForElementOptions = {},
): Promise<Element | null> {
  const existing = root.querySelector(selector);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const el = root.querySelector(selector);
      if (el) {
        observer.disconnect();
        clearTimeout(timer);
        resolve(el);
      }
    });

    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);

    observer.observe(root.documentElement, { childList: true, subtree: true });
  });
}
