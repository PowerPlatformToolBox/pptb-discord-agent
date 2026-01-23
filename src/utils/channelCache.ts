/**
 * Simple channel cache to reduce Discord API calls
 */

import type { Channel, Client } from 'discord.js';
import { getLogger } from './logger';

interface CacheEntry {
  channel: Channel;
  timestamp: number;
}

class ChannelCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttl: number = 5 * 60 * 1000; // 5 minutes
  private readonly logger = getLogger('ChannelCache');
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup every 10 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  public async fetch(client: Client, channelId: string): Promise<Channel | null> {
    const cached = this.cache.get(channelId);
    const now = Date.now();

    // Return cached channel if still valid
    if (cached && now - cached.timestamp < this.ttl) {
      return cached.channel;
    }

    // Fetch from Discord API
    try {
      const channel = await client.channels.fetch(channelId);
      if (channel) {
        this.cache.set(channelId, { channel, timestamp: now });
      }
      return channel;
    } catch (error) {
      // Log error for debugging (different failure scenarios: not found, no permissions, network errors, rate limiting)
      this.logger.debug('Failed to fetch channel', {
        channelId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Remove expired entries from cache
   */
  private cleanup(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [channelId, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= this.ttl) {
        this.cache.delete(channelId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.debug('Cleaned up expired cache entries', {
        removedCount,
        remaining: this.cache.size,
      });
    }
  }

  public invalidate(channelId: string): void {
    this.cache.delete(channelId);
  }

  public clear(): void {
    this.cache.clear();
  }

  /**
   * Stop cleanup interval (for testing or shutdown)
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
let channelCacheInstance: ChannelCache | null = null;

export function getChannelCache(): ChannelCache {
  if (!channelCacheInstance) {
    channelCacheInstance = new ChannelCache();
  }
  return channelCacheInstance;
}
