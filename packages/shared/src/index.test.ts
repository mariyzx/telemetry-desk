import { describe, expect, it } from 'vitest';
import { workspaceName } from './index.js';

describe('shared workspace', () => {
  it('exposes the canonical product name', () => {
    expect(workspaceName).toBe('TelemetryDesk');
  });
});
