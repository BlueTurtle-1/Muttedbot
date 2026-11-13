import 'dotenv/config';

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  sttServiceUrl: process.env.STT_SERVICE_URL || 'http://localhost:8000/transcribe',
  wakeWord: (process.env.WAKE_WORD || 'hey mutted bot').toLowerCase(),
  defaultVolume: Number(process.env.DEFAULT_VOLUME || 50),
  autoLeaveMs: Number(process.env.AUTO_LEAVE_MS || 300000),
};