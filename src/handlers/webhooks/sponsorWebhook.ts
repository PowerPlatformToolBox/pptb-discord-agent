import { EmbedBuilder } from 'discord.js';

export interface SponsorWebhookPayload {
  action: 'created' | 'cancelled' | 'edited' | 'tier_changed';
  sponsorship: {
    node_id: string;
    created_at: string;
    updated_at?: string;
    sponsor: {
      login: string;
      id: number;
      avatar_url: string;
      type: string;
      url: string;
    };
    sponsorable: {
      login: string;
      id: number;
      avatar_url: string;
      type: string;
      url: string;
    };
    tier: {
      node_id: string;
      created_at: string;
      updated_at?: string;
      description: string;
      monthly_price_in_cents: number;
      name: string;
      is_custom: boolean;
    };
    privacy_level: 'public' | 'private';
    monthly_price_in_cents: number;
  };
  changes?: {
    tier?: {
      from?: {
        monthly_price_in_cents?: number;
        name?: string;
      };
    };
  };
  sender: {
    login: string;
    id: number;
    avatar_url: string;
    type: string;
    url: string;
  };
}

export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function createSponsorEmbed(payload: SponsorWebhookPayload): EmbedBuilder | null {
  const isPrivate = payload.sponsorship.privacy_level === 'private';
  const sponsorName = isPrivate ? 'Anonymous Sponsor' : payload.sponsorship.sponsor.login;
  const sponsorAvatar = isPrivate ? undefined : payload.sponsorship.sponsor.avatar_url;

  const embed = new EmbedBuilder()
    .setColor(0xe1165b)
    .setTimestamp(new Date(payload.sponsorship.created_at))
    .setFooter({ text: 'GitHub Sponsors' });

  switch (payload.action) {
    case 'created': {
      const tierName = payload.sponsorship.tier.name;
      const amount = formatCurrency(payload.sponsorship.monthly_price_in_cents);

      embed
        .setTitle('💝 New Sponsor!')
        .setDescription(
          `**${sponsorName}** is now sponsoring ${payload.sponsorship.sponsorable.login}!`
        )
        .addFields(
          { name: 'Tier', value: tierName, inline: true },
          { name: 'Amount', value: `${amount}/month`, inline: true },
          {
            name: 'Visibility',
            value: isPrivate ? '🔒 Private' : '🌐 Public',
            inline: true,
          }
        );

      if (sponsorAvatar && !isPrivate) {
        embed.setThumbnail(sponsorAvatar);
      }
      break;
    }

    case 'cancelled': {
      // Do not notify on cancellations
      return null;
    }

    case 'tier_changed': {
      const newAmount = formatCurrency(payload.sponsorship.monthly_price_in_cents);
      const tierName = payload.sponsorship.tier.name;
      const previousAmountCents = payload.changes?.tier?.from?.monthly_price_in_cents;
      if (
        typeof previousAmountCents === 'number' &&
        payload.sponsorship.monthly_price_in_cents <= previousAmountCents
      ) {
        // Suppress notifications for downgrades or equal tiers
        return null;
      }

      embed
        .setTitle('📈 Sponsorship Tier Upgraded')
        .setDescription(`**${sponsorName}** increased their sponsorship tier.`)
        .addFields(
          { name: 'New Tier', value: tierName, inline: true },
          { name: 'New Amount', value: `${newAmount}/month`, inline: true }
        )
        .setColor(0x0366d6);

      if (sponsorAvatar && !isPrivate) {
        embed.setThumbnail(sponsorAvatar);
      }
      break;
    }

    case 'edited': {
      const amount = formatCurrency(payload.sponsorship.monthly_price_in_cents);
      const previousAmountCents = payload.changes?.tier?.from?.monthly_price_in_cents;
      if (
        typeof previousAmountCents === 'number' &&
        payload.sponsorship.monthly_price_in_cents <= previousAmountCents
      ) {
        // Suppress notifications for downgrades or equal updates
        return null;
      }

      embed
        .setTitle('✏️ Sponsorship Updated (Upgrade)')
        .setDescription(`**${sponsorName}** increased their sponsorship.`)
        .addFields(
          { name: 'Tier', value: payload.sponsorship.tier.name, inline: true },
          { name: 'Amount', value: `${amount}/month`, inline: true }
        )
        .setColor(0xffd700);

      if (sponsorAvatar && !isPrivate) {
        embed.setThumbnail(sponsorAvatar);
      }
      break;
    }

    default:
      embed.setTitle('💝 Sponsor Event').setDescription(`Sponsorship event: ${payload.action}`);
  }

  return embed;
}

export function createSponsorSummaryEmbed(
  payload: SponsorWebhookPayload,
  totalMonthlyAmount: number
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('💝 Sponsorship Summary')
    .setColor(0xe1165b)
    .setDescription(`Monthly recurring sponsorship support`)
    .addFields(
      {
        name: 'Active Monthly Support',
        value: formatCurrency(totalMonthlyAmount),
        inline: true,
      },
      {
        name: 'Last Update',
        value: `<t:${Math.floor(new Date(payload.sponsorship.updated_at || payload.sponsorship.created_at).getTime() / 1000)}:R>`,
        inline: true,
      }
    )
    .setTimestamp();
}
