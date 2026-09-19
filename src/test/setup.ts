import "@testing-library/jest-dom/vitest";

// jsdom reports `en-US`; the suite runs against the pt-BR default unless a test sets `?lang=`.
Object.defineProperty(window.navigator, "language", {
  configurable: true,
  get: () => "pt-BR",
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
