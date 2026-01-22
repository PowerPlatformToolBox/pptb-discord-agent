/**
 * Simple channel cache to reduce Discord API calls
 */

import type { Channel, Client } from 'discord.js';

interface CacheEntry {
	channel: Channel;
	timestamp: number;
}

class ChannelCache {
	private readonly cache = new Map<string, CacheEntry>();
	private readonly ttl: number = 5 * 60 * 1000; // 5 minutes

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
		} catch {
			// If fetch fails, return null (channel not found or bot lacks access)
			return null;
		}
	}

	public invalidate(channelId: string): void {
		this.cache.delete(channelId);
	}

	public clear(): void {
		this.cache.clear();
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
