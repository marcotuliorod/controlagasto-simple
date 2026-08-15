import { vi } from 'vitest';

// jsdom doesn't implement navigator.serviceWorker or PWA-related browser APIs.
// Individual test files may still override navigator/matchMedia for
// scenario-specific behavior (e.g. simulating iOS) — these are just the
// baseline mocks so tests that don't care about PWA specifics don't crash.

if (!('serviceWorker' in navigator)) {
  Object.defineProperty(window.navigator, 'serviceWorker', {
    writable: true,
    configurable: true,
    value: {
      ready: Promise.resolve({}),
      getRegistration: vi.fn().mockResolvedValue(null),
    },
  });
}

if (!('matchMedia' in window)) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

if (!('PushManager' in window)) {
  Object.defineProperty(window, 'PushManager', {
    writable: true,
    configurable: true,
    value: function PushManager() {},
  });
}
