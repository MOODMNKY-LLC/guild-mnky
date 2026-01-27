/**
 * Discord Webhook Integration
 * 
 * Functions to send Discord notifications for Sherpa session events
 */

const DISCORD_WEBHOOK_URL = process.env.DISCORD_SHERPA_WEBHOOK_URL;

export interface DiscordWebhookEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp?: string;
  footer?: {
    text: string;
  };
}

export interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordWebhookEmbed[];
  username?: string;
  avatar_url?: string;
}

/**
 * Send a Discord webhook notification
 */
export async function sendDiscordWebhook(payload: DiscordWebhookPayload): Promise<boolean> {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn('Discord webhook URL not configured. Skipping Discord notification.');
    return false;
  }

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord webhook error:', response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending Discord webhook:', error);
    return false;
  }
}

/**
 * Send notification when a new Sherpa session is created
 */
export async function notifyDiscordSessionCreated(
  sessionId: string,
  activityType: string,
  activityName: string | null,
  difficulty: string | null,
  scheduledStart: string,
  enrollmentClosesAt: string | null,
  description: string | null,
  maxSeekers: number,
  sherpaName: string,
  communityName: string,
  sessionUrl: string
) {
  const activityDisplay = activityName || activityType;
  const startTime = new Date(scheduledStart).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const embed: DiscordWebhookEmbed = {
    title: `🎯 New Sherpa Session: ${activityDisplay}`,
    description: description || `A new ${activityType} teaching session has been created!`,
    color: 0x00ff00, // Green
    fields: [
      {
        name: 'Sherpa',
        value: sherpaName,
        inline: true,
      },
      {
        name: 'Activity',
        value: activityDisplay,
        inline: true,
      },
      {
        name: 'Scheduled Start',
        value: startTime,
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: `${communityName} • Open Enrollment`,
    },
  };

  if (difficulty) {
    embed.fields?.push({
      name: 'Difficulty',
      value: difficulty,
      inline: true,
    });
  }

  if (enrollmentClosesAt) {
    const closesTime = new Date(enrollmentClosesAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    embed.fields?.push({
      name: 'Enrollment Closes',
      value: closesTime,
      inline: true,
    });
  }

  embed.fields?.push({
    name: 'Available Slots',
    value: `${maxSeekers} Seeker${maxSeekers !== 1 ? 's' : ''} available`,
    inline: true,
  });

  const payload: DiscordWebhookPayload = {
    content: `🔔 **New Sherpa Session Available!**\n\nJoin ${sherpaName} for a ${activityDisplay} session starting ${startTime}. [View Session →](${sessionUrl})`,
    embeds: [embed],
    username: 'Sherpa Hub',
  };

  return await sendDiscordWebhook(payload);
}

/**
 * Send notification when a Seeker joins a session
 */
export async function notifyDiscordSeekerJoined(
  sessionId: string,
  activityName: string,
  seekerName: string,
  currentSeekers: number,
  maxSeekers: number,
  sessionUrl: string
) {
  const slotsRemaining = maxSeekers - currentSeekers;

  const embed: DiscordWebhookEmbed = {
    title: `👤 Seeker Joined Session`,
    description: `${seekerName} joined the ${activityName} session`,
    color: 0x0099ff, // Blue
    fields: [
      {
        name: 'Slots Remaining',
        value: `${slotsRemaining}/${maxSeekers}`,
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
  };

  const payload: DiscordWebhookPayload = {
    embeds: [embed],
    username: 'Sherpa Hub',
  };

  return await sendDiscordWebhook(payload);
}

/**
 * Send notification when a session is starting soon (reminder)
 */
export async function notifyDiscordSessionStarting(
  sessionId: string,
  activityName: string,
  scheduledStart: string,
  sessionUrl: string
) {
  const startTime = new Date(scheduledStart).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const embed: DiscordWebhookEmbed = {
    title: `⏰ Session Starting Soon`,
    description: `The ${activityName} session starts ${startTime}`,
    color: 0xffaa00, // Orange
    timestamp: new Date().toISOString(),
  };

  const payload: DiscordWebhookPayload = {
    content: `🔔 **Session Reminder**\n\nYour session is starting soon! [View Details →](${sessionUrl})`,
    embeds: [embed],
    username: 'Sherpa Hub',
  };

  return await sendDiscordWebhook(payload);
}
