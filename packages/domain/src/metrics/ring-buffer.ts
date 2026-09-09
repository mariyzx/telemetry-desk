export class RingBuffer<T> {
  private readonly items: T[];
  private head = 0;
  private count = 0;

  constructor(readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error(`RingBuffer capacity must be a positive integer, got ${capacity}`);
    }
    this.items = new Array<T>(capacity);
  }

  get size(): number {
    return this.count;
  }

  push(item: T): void {
    if (this.count < this.capacity) {
      this.items[(this.head + this.count) % this.capacity] = item;
      this.count += 1;
      return;
    }

    this.items[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
  }

  toArray(): T[] {
    const result = new Array<T>(this.count);
    for (let i = 0; i < this.count; i += 1) {
      result[i] = this.items[(this.head + i) % this.capacity] as T;
    }
    return result;
  }
}

/** Capacity for ~10 minutes of gateway samples at 1 sample/second. */
export const GATEWAY_RING_BUFFER_CAPACITY = 10 * 60;
