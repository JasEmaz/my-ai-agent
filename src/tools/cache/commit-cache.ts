/**
 * Persistent cache implementation for commit message generation
 * Uses LFU (Least-Frequently-Used) eviction strategy based on `hitCount`.
 * Entries store a `hitCount` and `timestamp`; when the cache exceeds `maxSize`,
 * the entry with the lowest `hitCount` is evicted. `timestamp` is updated on
 * access to help with recency diagnostics but eviction prioritizes `hitCount`.
 */

import type { LLMResponse } from '../llm/types';

interface CacheEntry {
  response: LLMResponse;
  timestamp: number;
  hitCount: number;
}

export class CommitCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize = 100, ttlHours = 24) {
    this.maxSize = maxSize;
    this.ttlMs = ttlHours * 60 * 60 * 1000;
  }

  get(key: string): LLMResponse | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const isExpired = Date.now() - entry.timestamp > this.ttlMs;
    if (isExpired) {
      this.cache.delete(key);
      return undefined;
    }

    // Update hit count and timestamp
    entry.hitCount++;
    entry.timestamp = Date.now();
    return entry.response;
  }

  set(key: string, response: LLMResponse): void {
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      hitCount: 1,
    });
  }

  private evictLeastUsed(): void {
    let leastUsedKey: string | undefined;
    let minHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hitCount < minHits) {
        minHits = entry.hitCount;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }
}

export const commitCache = new CommitCache();