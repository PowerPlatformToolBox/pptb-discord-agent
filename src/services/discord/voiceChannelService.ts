/**
 * Service for updating Discord voice channel names
 */

import type { Client, VoiceChannel } from 'discord.js';
import { ChannelType } from 'discord.js';
import { getChannelCache } from '../../utils/channelCache';
import { createErrorLogObject } from '../../utils/errorHelper';
import { LoggerFactory } from '../../utils/logger';

export class VoiceChannelService {
	private readonly logger = LoggerFactory.forService('VoiceChannelService');

	/**
	 * Update a voice channel name with a specific value
	 */
	public async updateChannelName(
		client: Client,
		channelId: string,
		newName: string
	): Promise<boolean> {
		try {
			const channelCache = getChannelCache();
			const channel = await channelCache.fetch(client, channelId);

			if (!channel) {
				this.logger.error('Voice channel not found', { channelId });
				return false;
			}

			if (channel.type !== ChannelType.GuildVoice) {
				this.logger.error('Channel is not a voice channel', {
					channelId,
					type: channel.type,
				});
				return false;
			}

			const voiceChannel = channel as VoiceChannel;
			const oldName = voiceChannel.name;

			// Only update if the name is different
			if (oldName === newName) {
				this.logger.debug('Voice channel name unchanged', {
					channelId,
					name: newName,
				});
				return true;
			}

			await voiceChannel.setName(newName);

			this.logger.info('Voice channel name updated', {
				channelId,
				oldName,
				newName,
			});

			return true;
		} catch (error) {
			this.logger.error('Failed to update voice channel name', {
				channelId,
				newName,
				...createErrorLogObject(error),
			});
			return false;
		}
	}

	/**
	 * Update the stars voice channel with the current star count
	 */
	public async updateStarsChannel(
		client: Client,
		channelId: string,
		starCount: number
	): Promise<boolean> {
		const channelName = `⭐ ${starCount.toLocaleString()}`;
		return this.updateChannelName(client, channelId, channelName);
	}

	/**
	 * Update the release voice channel with the latest version
	 */
	public async updateReleaseChannel(
		client: Client,
		channelId: string,
		version: string
	): Promise<boolean> {
		const channelName = `🚀 Release: ${version}`;
		return this.updateChannelName(client, channelId, channelName);
	}

	/**
	 * Update the insider voice channel with the latest insider version
	 */
	public async updateInsiderChannel(
		client: Client,
		channelId: string,
		version: string
	): Promise<boolean> {
		const channelName = `🔬 Insider: ${version}`;
		return this.updateChannelName(client, channelId, channelName);
	}
}

let voiceChannelServiceInstance: VoiceChannelService | null = null;

export function getVoiceChannelService(): VoiceChannelService {
	if (!voiceChannelServiceInstance) {
		voiceChannelServiceInstance = new VoiceChannelService();
	}
	return voiceChannelServiceInstance;
}
