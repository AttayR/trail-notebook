// Collect variable-size Float32 chunks into one fixed-size buffer. Overflow is dropped.
export class SampleAccumulator {
  readonly capacity: number;
  private buf: Float32Array;
  private filled = 0;

  constructor(capacity: number) {
    if (capacity <= 0) throw new Error('capacity must be positive');
    this.capacity = capacity;
    this.buf = new Float32Array(capacity);
  }

  /** Appends as much of `chunk` as fits. Returns the number of samples taken. */
  push(chunk: Float32Array): number {
    const take = Math.min(chunk.length, this.capacity - this.filled);
    if (take > 0) {
      this.buf.set(take === chunk.length ? chunk : chunk.subarray(0, take), this.filled);
      this.filled += take;
    }
    return take;
  }

  get length(): number {
    return this.filled;
  }

  get isFull(): boolean {
    return this.filled >= this.capacity;
  }

  /** 0..1 */
  get progress(): number {
    return this.filled / this.capacity;
  }

  /** Copy of the samples collected so far. */
  toArray(): Float32Array {
    return this.buf.slice(0, this.filled);
  }

  reset(): void {
    this.filled = 0;
  }
}
