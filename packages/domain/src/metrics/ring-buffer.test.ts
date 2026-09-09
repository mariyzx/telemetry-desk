import { describe, expect, it } from 'vitest';
import { RingBuffer } from './ring-buffer.js';

describe('RingBuffer', () => {
  it('stores items in insertion order up to capacity', () => {
    const buffer = new RingBuffer<number>(3);

    buffer.push(1);
    buffer.push(2);

    expect(buffer.size).toBe(2);
    expect(buffer.capacity).toBe(3);
    expect(buffer.toArray()).toEqual([1, 2]);
  });

  it('evicts the oldest item when capacity is exceeded', () => {
    const buffer = new RingBuffer<string>(3);

    buffer.push('a');
    buffer.push('b');
    buffer.push('c');
    buffer.push('d');

    expect(buffer.size).toBe(3);
    expect(buffer.toArray()).toEqual(['b', 'c', 'd']);
  });

  it('holds at least 10 minutes of 1s gateway samples', () => {
    const capacity = 10 * 60;
    const buffer = new RingBuffer<{ t: number }>(capacity);

    for (let t = 0; t < capacity + 5; t += 1) {
      buffer.push({ t });
    }

    expect(buffer.size).toBe(capacity);
    expect(buffer.toArray()[0]).toEqual({ t: 5 });
    expect(buffer.toArray()[capacity - 1]).toEqual({ t: capacity + 4 });
  });

  it('rejects non-positive capacity', () => {
    expect(() => new RingBuffer(0)).toThrow(/capacity/i);
    expect(() => new RingBuffer(-1)).toThrow(/capacity/i);
  });
});
