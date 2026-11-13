import { SlashCommandBuilder } from 'discord.js';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { Ytdl } from '@distube/ytdl-core';
import play from '@iamtraction/play-dl';
import { getQueue, getUploadUsage } from '../music/queue.js';
import { ensureConnection, playNext, enqueueAndPlay, enqueueManyAndPlay } from '../music/player.js';
import { isPlayBlacklisted } from '../music/blacklist.js';
import path from 'node:path';
import fs from 'node:fs';
import { config } from '../config.js';

const yt = new Ytdl();
const uploadCooldowns = new Map();
const guildUploadStates = new Map();
const activeUploadReservations = new Map();
const uploadFilePattern = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}\.upload$/i;

function getTempUploadUsage(tempDir) {
  let count = 0;
  let bytes = 0;

  for (const entry of fs.readdirSync(tempDir, { withFileTypes: true })) {
    if (!entry.isFile() || !uploadFilePattern.test(entry.name)) continue;
    const filePath = path.join(tempDir, entry.name);
    if (activeUploadReservations.has(filePath)) continue;
    count++;
    bytes += fs.statSync(filePath).size;
  }

  return { count, bytes };
}

function getReservedUploadUsage(guildId = null) {
  let count = 0;
  let bytes = 0;

  for (const reservation of activeUploadReservations.values()) {
    if (guildId && reservation.guildId !== guildId) continue;
    count++;
    bytes += reservation.bytes;
  }

  return { count, bytes };
}

function pruneUploadCooldowns(now) {
  for (const [key, expiresAt] of uploadCooldowns) {
    if (expiresAt <= now) uploadCooldowns.delete(key);
  }
}

export const data = new SlashCommandBuilder()
  .setName('link')
  .setDescription('Play a YouTube link, playlist, or upload a file')
  .addStringOption((opt) =>
    opt.setName('url').setDescription('YouTube video or playlist URL').setRequired(false)
  )
  .addAttachmentOption((opt) =>
    opt.setName('file').setDescription('Audio or video file').setRequired(false)
  );

export async function execute(interaction) {
  const url = interaction.options.getString('url');
  const file = interaction.options.getAttachment('file');
  const member = interaction.member;
  const voiceChannel = member.voice?.channel;

  if (!voiceChannel) {
    return interaction.reply({ content: '❌ You need to be in a voice channel.', ephemeral: true });
  }

  if (!url && !file) {
    return interaction.reply({ content: '❌ You must provide either a URL or a file.', ephemeral: true });
  }

  if (url && file) {
    return interaction.reply({ content: '❌ Please provide only one: a URL OR a file, not both.', ephemeral: true });
  }

  await interaction.deferReply();

  // ==========================================
  // 🎵 HANDLE URL (YouTube Video or Playlist)
  // ==========================================
  if (url) {
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return interaction.editReply('❌ Please provide a valid YouTube link.');
    }

    const protocol = parsedUrl.protocol.toLowerCase();
    const host = parsedUrl.hostname.toLowerCase();
    const allowedHosts = new Set([
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'youtu.be',
      'www.youtu.be',
    ]);

    if (!['http:', 'https:'].includes(protocol) || !allowedHosts.has(host)) {
      return interaction.editReply('❌ Please provide a valid YouTube link.');
    }

    // Check if it's a playlist
    if (url.includes('list=')) {
      try {
        const q = getQueue(interaction.guild.id);
        const availableSlots = q.availableSlots;
        if (availableSlots === 0) {
          return interaction.editReply('❌ The queue is full. Try again after a track finishes.');
        }

        const playlist = await play.playlist_info(url, { incomplete: true });
        const initialVideos = playlist.videos || [];
        if (initialVideos.length < availableSlots) {
          await playlist.fetch(availableSlots - initialVideos.length);
        }
        const videos = (playlist.videos || []).slice(0, availableSlots);

        if (!videos || videos.length === 0) {
          return interaction.editReply('❌ No playable videos found in that playlist.');
        }

        const eligibleVideos = videos.filter((video) =>
          typeof video.title === 'string' && !isPlayBlacklisted(video.title),
        );
        const skippedCount = videos.length - eligibleVideos.length;
        if (eligibleVideos.length === 0) {
          return interaction.editReply('❌ No eligible videos found; playlist titles may be blocked or unavailable.');
        }

        const tracks = eligibleVideos.map((video) => ({
          title: video.title,
          url: video.url,
          requestedBy: member.user.username,
        }));
        const added = await enqueueManyAndPlay(
          interaction.guild,
          voiceChannel,
          interaction.channel,
          tracks,
        );
        if (!added) return interaction.editReply('❌ The queue filled up while fetching the playlist. Try again.');

        const skippedMessage = skippedCount > 0
          ? ` Skipped ${skippedCount} blocked or untitled video(s).`
          : '';
        return interaction.editReply(`✅ Queued **${tracks.length}** songs from the playlist.${skippedMessage}`);
      } catch (error) {
        console.error('Playlist fetch error:', error);
        return interaction.editReply('❌ Failed to fetch the playlist.');
      }
    }

    // Single Video
    let title;
    try {
      const info = await yt.getInfo(url);
      title = info.videoDetails?.title;
      if (!title) throw new Error('YouTube returned no video title.');
    } catch (e) {
      console.error("Failed to fetch video title:", e);
      return interaction.editReply('❌ Could not verify the video title. Please try again later.');
    }

    if (isPlayBlacklisted(title)) {
      return interaction.editReply('❌ That video is blocked by the bot’s content filter.');
    }

    const track = {
      title: title,
      url: url,
      requestedBy: member.user.username,
    };

    const added = await enqueueAndPlay(interaction.guild, voiceChannel, interaction.channel, track);
    if (!added) return interaction.editReply('❌ The queue is full. Try again after a track finishes.');
    return interaction.editReply(`🔗 Added to queue: **${track.title}**`);
  }

  // ==========================================
  // 📁 HANDLE FILE UPLOAD
  // ==========================================
  if (file) {
    if (!file.contentType?.startsWith('audio/') && !file.contentType?.startsWith('video/')) {
      return interaction.editReply('❌ Please upload a valid audio or video file.');
    }

    if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > config.maxUploadBytes) {
      return interaction.editReply(`❌ Files must be no larger than ${Math.floor(config.maxUploadBytes / (1024 * 1024))} MiB.`);
    }

    const tempDir = path.join(process.cwd(), 'temp');
    fs.mkdirSync(tempDir, { recursive: true });

    const guildId = interaction.guild.id;
    const userKey = member.user.id;
    const now = Date.now();
    pruneUploadCooldowns(now);

    const cooldownExpiry = uploadCooldowns.get(userKey) || 0;
    if (cooldownExpiry > now) {
      const secondsLeft = Math.ceil((cooldownExpiry - now) / 1000);
      return interaction.editReply(`⏳ Please wait ${secondsLeft}s before uploading another file.`);
    }

    const guildState = guildUploadStates.get(guildId) || { active: 0 };
    if (guildState.active >= config.maxConcurrentUploadsPerGuild) {
      return interaction.editReply('⏳ A file is already being uploaded for this server. Try again shortly.');
    }

    const q = getQueue(guildId);
    if (!q.canAdd()) {
      return interaction.editReply('❌ The queue is full. Try again after a track finishes.');
    }

    const guildReservations = getReservedUploadUsage(guildId);
    if (
      q.uploadCount + guildReservations.count >= config.maxQueuedUploadsPerGuild ||
      q.uploadBytes + guildReservations.bytes + file.size > config.maxQueuedUploadBytesPerGuild
    ) {
      return interaction.editReply('❌ The server upload queue is full. Try again after a track finishes.');
    }

    const diskUsage = getTempUploadUsage(tempDir);
    const totalUsage = getUploadUsage();
    const allReservations = getReservedUploadUsage();
    const usedCount = Math.max(diskUsage.count, totalUsage.count) + allReservations.count;
    const usedBytes = Math.max(diskUsage.bytes, totalUsage.bytes) + allReservations.bytes;
    if (
      usedCount >= config.maxTempUploadFiles ||
      usedBytes + file.size > config.maxTempUploadBytes
    ) {
      return interaction.editReply('❌ The bot has reached its temporary upload storage limit. Try again later.');
    }

    const filePath = path.join(tempDir, `${randomUUID()}.upload`);
    guildState.active++;
    guildUploadStates.set(guildId, guildState);
    uploadCooldowns.set(userKey, now + config.uploadCooldownMs);
    activeUploadReservations.set(filePath, { guildId, bytes: file.size });

    let queued = false;
    try {
      const response = await fetch(file.url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const contentLength = Number(response.headers.get('content-length'));
      if (Number.isFinite(contentLength) && contentLength > config.maxUploadBytes) {
        const error = new Error('Upload exceeds the configured size limit.');
        error.code = 'UPLOAD_TOO_LARGE';
        throw error;
      }

      let downloadedBytes = 0;
      const sizeLimiter = new Transform({
        transform(chunk, encoding, callback) {
          downloadedBytes += chunk.length;
          if (downloadedBytes > config.maxUploadBytes) {
            const error = new Error('Upload exceeds the configured size limit.');
            error.code = 'UPLOAD_TOO_LARGE';
            callback(error);
            return;
          }
          callback(null, chunk);
        },
      });

      if (!response.body) throw new Error('Attachment response had no body.');
      await pipeline(
        Readable.fromWeb(response.body),
        sizeLimiter,
        createWriteStream(filePath, { flags: 'wx' }),
      );

      if (downloadedBytes !== file.size) {
        const error = new Error('Downloaded size did not match attachment metadata.');
        error.code = 'UPLOAD_SIZE_MISMATCH';
        throw error;
      }

      const connectedQueue = ensureConnection(interaction.guild, voiceChannel, interaction.channel);

      const track = {
        title: file.name,
        filePath: filePath,
        fileSize: downloadedBytes,
        requestedBy: member.user.username,
      };

      if (!connectedQueue.add(track)) {
        const error = new Error('Queue filled while the upload was downloading.');
        error.code = 'QUEUE_FULL';
        throw error;
      }
      queued = true;
    } catch (error) {
      console.error('File download error:', error);
      try {
        fs.rmSync(filePath, { force: true });
      } catch (cleanupError) {
        console.error(`Failed to delete partial upload: ${filePath}`, cleanupError);
      }
      if (error.code === 'UPLOAD_TOO_LARGE') {
        return interaction.editReply(`❌ Files must be no larger than ${Math.floor(config.maxUploadBytes / (1024 * 1024))} MiB.`);
      }
      if (error.code === 'QUEUE_FULL') {
        return interaction.editReply('❌ The queue filled up while the file was downloading. Try again.');
      }
      return interaction.editReply('❌ Failed to download and queue the file.');
    } finally {
      activeUploadReservations.delete(filePath);
      guildState.active = Math.max(0, guildState.active - 1);
      if (guildState.active === 0) guildUploadStates.delete(guildId);
    }

    if (queued) {
      const q = getQueue(guildId);
      if (!q.playing) playNext(guildId);
      return interaction.editReply(`📁 Added to queue: **${file.name}**`);
    }
  }
}