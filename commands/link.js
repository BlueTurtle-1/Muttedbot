import { SlashCommandBuilder } from 'discord.js';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { Ytdl } from '@distube/ytdl-core';
import play from '@iamtraction/play-dl';
import { getQueue } from '../music/queue.js';
import { ensureConnection, playNext, enqueueAndPlay } from '../music/player.js';
import path from 'node:path';
import fs from 'node:fs';

const yt = new Ytdl();

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

  const q = ensureConnection(interaction.guild, voiceChannel, interaction.channel);

  // ==========================================
  // 🎵 HANDLE URL (YouTube Video or Playlist)
  // ==========================================
  if (url) {
    if (!url.includes('youtube.com/') && !url.includes('youtu.be/')) {
      return interaction.editReply('❌ Please provide a valid YouTube link.');
    }

    // Check if it's a playlist
    if (url.includes('list=')) {
      try {
        const playlist = await play.playlist_info(url, { incomplete: true });
        await playlist.fetch();
        const videos = playlist.videos;

        if (!videos || videos.length === 0) {
          return interaction.editReply('❌ No playable videos found in that playlist.');
        }

        let addedCount = 0;
        for (const video of videos) {
          const track = {
            title: video.title,
            url: video.url,
            requestedBy: member.user.username,
          };
          await enqueueAndPlay(interaction.guild, voiceChannel, interaction.channel, track);
          addedCount++;
        }

        return interaction.editReply(`✅ Queued **${addedCount}** songs from the playlist.`);
      } catch (error) {
        console.error('Playlist fetch error:', error);
        return interaction.editReply('❌ Failed to fetch the playlist.');
      }
    }

    // Single Video
    let title = 'Linked YouTube Video';
    try {
      const info = await yt.getInfo(url);
      title = info.videoDetails.title;
    } catch (e) {
      console.error("Failed to fetch video title:", e);
    }

    const track = {
      title: title,
      url: url,
      requestedBy: member.user.username,
    };

    await enqueueAndPlay(interaction.guild, voiceChannel, interaction.channel, track);
    return interaction.editReply(`🔗 Added to queue: **${track.title}**`);
  }

  // ==========================================
  // 📁 HANDLE FILE UPLOAD
  // ==========================================
  if (file) {
    if (!file.contentType?.startsWith('audio/') && !file.contentType?.startsWith('video/')) {
      return interaction.editReply('❌ Please upload a valid audio or video file.');
    }

    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const filePath = path.join(tempDir, `${Date.now()}-${file.name}`);
    let downloadSuccess = false; // 👈 Track if download finishes

    try {
      const response = await fetch(file.url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      await pipeline(Readable.fromWeb(response.body), createWriteStream(filePath));
      downloadSuccess = true; // 👈 Mark as successful

      const track = {
        title: file.name,
        filePath: filePath,
        requestedBy: member.user.username,
      };

      q.add(track);
      if (!q.playing) {
        playNext(interaction.guild.id);
      }

      return interaction.editReply(`📁 Added to queue: **${file.name}**`);
      
    } catch (error) {
      console.error('File download error:', error);
      
      // 👇 Cleanup if download failed OR if skipped mid-download
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted failed/partial file: ${filePath}`);
        } catch (err) {
          console.error(`Failed to delete partial file: ${filePath}`, err);
        }
      }
      
      if (!downloadSuccess) {
        return interaction.editReply('❌ Failed to download and queue the file.');
      }
    }
  }
}