import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
  NoSubscriberBehavior,
} from '@discordjs/voice';
import { Ytdl, Quality } from '@distube/ytdl-core';
import { getQueue, deleteQueue } from './queue.js';
import { config } from '../config.js';
import fs from 'node:fs';
import path from 'node:path';

const yt = new Ytdl();

// 👇 UPDATED CLEANUP FUNCTION with retry logic for Windows EBUSY errors
function sweepTempFolder(keepFilePath = null) {
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) return;

  const files = fs.readdirSync(tempDir);
  for (const file of files) {
    const fullPath = path.join(tempDir, file);
    
    // If this file is the one currently playing, DO NOT delete it.
    if (keepFilePath && path.resolve(fullPath) === path.resolve(keepFilePath)) {
      continue;
    }

    let attempts = 0;
    const maxAttempts = 5;
    
    const tryDelete = () => {
      try {
        fs.unlinkSync(fullPath);
        console.log(`🗑️ Swept and deleted orphaned temp file: ${file}`);
      } catch (err) {
        attempts++;
        // If the file is busy and we have retries left, wait 200ms and try again
        if (err.code === 'EBUSY' && attempts < maxAttempts) {
          console.log(`⏳ File busy, retrying (${attempts}/${maxAttempts}): ${file}`);
          setTimeout(tryDelete, 200);
        } else {
          console.error(`Failed to sweep file: ${file}`, err);
        }
      }
    };
    
    tryDelete();
  }
}

export function ensureConnection(guild, voiceChannel, textChannel) {
  const q = getQueue(guild.id);
  if (!q.connection) {
    q.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
    });
    
    q.player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play
      }
    });
    
    q.connection.subscribe(q.player);
    q.textChannel = textChannel;
    q.volume = config.defaultVolume;

    q.player.on(AudioPlayerStatus.Idle, () => {
      sweepTempFolder(null); 
      playNext(guild.id);
    });

    q.player.on('error', (err) => {
      console.error('Audio player error:', err);
      q.textChannel?.send(`⚠️ Playback error: ${err.message}`);
      sweepTempFolder(null);
      playNext(guild.id);
    });
    
    q.player.on('stateChange', (oldState, newState) => {
      console.log(`Player State: ${oldState.status} -> ${newState.status}`);
    });

    q.connection.on('stateChange', (oldState, newState) => {
      console.log(`Connection State: ${oldState.status} -> ${newState.status}`);
    });

    q.connection.on('destroy', () => {
      sweepTempFolder(null); 
    });

    setupAutoLeave(guild.id);
  }
  return q;
}

export async function playNext(guildId) {
  const q = getQueue(guildId);
  const track = q.next();

  if (!track) {
    q.playing = false;
    return;
  }

  if ((!track.url || typeof track.url !== 'string') && !track.filePath) {
    console.error(`❌ Cannot play "${track.title}": URL/File is missing or invalid.`);
    q.textChannel?.send(`⚠️ Couldn't play **${track.title}** (invalid source), skipping.`);
    return playNext(guildId);
  }

  try {
    try {
      await entersState(q.connection, VoiceConnectionStatus.Ready, 30000);
    } catch (error) {
      console.error('Voice connection not ready:', error);
      q.textChannel?.send('⚠️ Voice connection failed to establish, please try again.');
      return;
    }

    let resource;

    if (track.filePath) {
      sweepTempFolder(track.filePath); 

      resource = createAudioResource(track.filePath, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      });
    } else {
      sweepTempFolder(null);

      const info = await yt.getInfo(track.url);
      const stream = yt.download(info, {
        quality: Quality.HighestAudio,
        filter: { hasAudio: true, hasVideo: false },
      });
      resource = createAudioResource(stream, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      });
    }
    
    resource.volume?.setVolume((q.volume ?? 50) / 100);
    
    q.player.play(resource);
    q.playing = true;
    q.current = track;
    
    q.textChannel?.send(`🎶 Now playing: **${track.title}** (requested by ${track.requestedBy})`);

  } catch (err) {
    console.error('Failed to play track:', err);
    q.textChannel?.send(`⚠️ Couldn't play **${track.title}**, skipping.`);
    playNext(guildId);
  }
}

export async function enqueueAndPlay(guild, voiceChannel, textChannel, track) {
  const q = ensureConnection(guild, voiceChannel, textChannel);
  q.add(track);
  if (!q.playing) {
    playNext(guild.id);
  } else {
    textChannel.send(`➕ Added to queue: **${track.title}**`);
  }
}

export function skipTrack(guildId) {
  const q = getQueue(guildId);
  if (!q.player) return false;
  
  sweepTempFolder(null); 
  
  q.player.stop();
  return true;
}

export function pauseTrack(guildId) {
  const q = getQueue(guildId);
  return q.player?.pause() ?? false;
}

export function resumeTrack(guildId) {
  const q = getQueue(guildId);
  return q.player?.unpause() ?? false;
}

export function stopAndLeave(guildId) {
  const q = getQueue(guildId);
  
  sweepTempFolder(null);
  
  q.clear();
  q.player?.stop();
  q.connection?.destroy();
  deleteQueue(guildId);
}

export function setVolume(guildId, volume) {
  const q = getQueue(guildId);
  q.volume = volume;
  return true;
}

function setupAutoLeave(guildId) {
  const q = getQueue(guildId);
  q.connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(q.connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(q.connection, VoiceConnectionStatus.Connecting, 5000),
      ]);
    } catch {
      sweepTempFolder(null);
      stopAndLeave(guildId);
    }
  });
}