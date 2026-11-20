import type { ModelStore } from '../ModelStore.port.js';

export class InMemoryModelStore implements ModelStore {
  private readonly files = new Map<string, Uint8Array>();

  async has(key: string): Promise<boolean> {
    return this.files.has(key);
  }
  async read(key: string): Promise<Uint8Array | undefined> {
    const v = this.files.get(key);
    return v === undefined ? undefined : v.slice();
  }
  async write(key: string, bytes: Uint8Array): Promise<void> {
    this.files.set(key, bytes.slice());
  }
  async delete(key: string): Promise<void> {
    this.files.delete(key);
  }
  async keys(): Promise<readonly string[]> {
    return [...this.files.keys()].sort();
  }
  async size(): Promise<number> {
    let total = 0;
    for (const v of this.files.values()) total += v.byteLength;
    return total;
  }
}
