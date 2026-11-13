import 'dotenv/config';

const positiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  sttServiceUrl: process.env.STT_SERVICE_URL || 'http://localhost:8000/transcribe',
  wakeWord: (process.env.WAKE_WORD || 'hey mutted bot').toLowerCase(),
  defaultVolume: Number(process.env.DEFAULT_VOLUME || 50),
  autoLeaveMs: Number(process.env.AUTO_LEAVE_MS || 300000),
  maxUploadBytes: positiveInteger(process.env.MAX_UPLOAD_BYTES, 20 * 1024 * 1024),
  uploadCooldownMs: positiveInteger(process.env.UPLOAD_COOLDOWN_MS, 15000),
  maxConcurrentUploadsPerGuild: positiveInteger(process.env.MAX_CONCURRENT_UPLOADS_PER_GUILD, 1),
  maxQueuedUploadsPerGuild: positiveInteger(process.env.MAX_QUEUED_UPLOADS_PER_GUILD, 10),
  maxQueuedUploadBytesPerGuild: positiveInteger(
    process.env.MAX_QUEUED_UPLOAD_BYTES_PER_GUILD,
    100 * 1024 * 1024,
  ),
  maxTempUploadFiles: positiveInteger(process.env.MAX_TEMP_UPLOAD_FILES, 20),
  maxTempUploadBytes: positiveInteger(process.env.MAX_TEMP_UPLOAD_BYTES, 200 * 1024 * 1024),
  maxQueueTracksPerGuild: positiveInteger(process.env.MAX_QUEUE_TRACKS_PER_GUILD, 50),
};