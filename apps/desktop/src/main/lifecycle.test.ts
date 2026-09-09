import { expect, it } from 'vitest';
import { createAppLifecycle } from './lifecycle.js';

it('keeps isQuitting false until quit is requested', () => {
  const lifecycle = createAppLifecycle();
  let quitCalls = 0;

  expect(lifecycle.isQuitting()).toBe(false);

  lifecycle.requestQuit(() => {
    quitCalls += 1;
  });

  expect(lifecycle.isQuitting()).toBe(true);
  expect(quitCalls).toBe(1);
});

it('markQuitting flips the flag without calling quit', () => {
  const lifecycle = createAppLifecycle();

  lifecycle.markQuitting();

  expect(lifecycle.isQuitting()).toBe(true);
});
