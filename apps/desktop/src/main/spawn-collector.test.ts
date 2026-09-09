import { expect, it } from 'vitest';
import { resolveCollectorEntryPath } from './spawn-collector.js';

it('resolves the collector child entry under apps/collector/dist', () => {
  expect(resolveCollectorEntryPath().replaceAll('\\', '/')).toMatch(
    /apps\/collector\/dist\/main\.js$/,
  );
});
