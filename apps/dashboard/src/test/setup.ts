import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
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

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverStub,
});

HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => {
  const canvas = document.createElement('canvas');
  return new Proxy(
    { canvas },
    {
      get(target, property) {
        if (property in target) {
          return target[property as keyof typeof target];
        }
        if (property === 'measureText') {
          return () => ({ width: 0 });
        }
        if (property === 'createLinearGradient') {
          return () => ({ addColorStop: vi.fn() });
        }
        return vi.fn();
      },
    },
  );
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

afterEach(() => {
  cleanup();
});
