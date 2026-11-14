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

const yt = new Ytdl();

// 👇 New function to handle the 10-minute timeout
function startInactiveTimeout(guildId) {
  const q = getQueue(guildId);
  
  // Clear any existing timer
  if (q.inactiveTimeout) clearTimeout(q.inactiveTimeout);

  console.log(`⏳ Queue empty. Starting 10-minute auto-leave timer for guild ${guildId}.`);

  q.inactiveTimeout = setTimeout(() => {
    console.log(`⏰ 10 minutes of inactivity. Leaving channel.`);
    q.textChannel?.send(`👋 Left the channel due to 10 minutes of inactivity.`);
    stopAndLeave(guildId);
  }, 10 * 60 * 1000); // 10 minutes in milliseconds
}

function cleanupTrackFile(q, track, attempts = 0) {
  if (!track?.filePath || track.fileCleaned) return;

  try {
    fs.rmSync(track.filePath, { force: true });
    track.fileCleaned = true;
    q.releaseUpload(track);
  } catch (error) {
    if (['EBUSY', 'EPERM'].includes(error.code) && attempts < 5) {
      setTimeout(() => cleanupTrackFile(q, track, attempts + 1), 200);
      return;
    }
    console.error(`Failed to remove uploaded track: ${track.filePath}`, error);
  }
}

function updateBotPresence(client, track) {
  if (!client || !client.user) return;
  
  if (track) {
    client.user.setActivity(track.title, { type: 2 });
  } else {
    client.user.setActivity(null);
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
      cleanupTrackFile(q, q.current);
      q.current = null;
      q.playing = false;
      updateBotPresence(q.client, null); 
      if (q.closed) return;
      
      // 👇 Check if queue is empty to start the timer
      if (q.tracks.length === 0) {
        startInactiveTimeout(guild.id);
      } else {
        playNext(guild.id);
      }
    });

    q.player.on('error', (err) => {
      console.error('Audio player error:', err);
      q.textChannel?.send(`⚠️ Playback error: ${err.message}`);
      cleanupTrackFile(q, q.current);
      q.current = null;
      q.playing = false;
      updateBotPresence(q.client, null); 
      if (q.closed) return;
      playNext(guild.id);
    });
    
    q.player.on('stateChange', (oldState, newState) => {
      console.log(`Player State: ${oldState.status} -> ${newState.status}`);
    });

    q.connection.on('stateChange', (oldState, newState) => {
      console.log(`Connection State: ${oldState.status} -> ${newState.status}`);
    });

    setupAutoLeave(guild.id);
  }
  return q;
}

export async function playNext(guildId) {
  const q = getQueue(guildId);
  if (q.closed) return;
  const track = q.next();

  if (!track) {
    q.playing = false;
    updateBotPresence(q.client, null);
    // 👇 If we run out of songs here, start the timer
    startInactiveTimeout(guildId);
    return;
  }
  q.playing = true;

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
      cleanupTrackFile(q, track);
      q.current = null;
      q.playing = false;
      return;
    }

    if (q.closed) {
      cleanupTrackFile(q, track);
      q.current = null;
      return;
    }

    let resource;

    if (track.filePath) {
      resource = createAudioResource(track.filePath, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      });
    } else {
      const info = await yt.getInfo(track.url);
      if (q.closed) return;
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
    
    updateBotPresence(q.client, track);
    
    q.textChannel?.send(`🎶 Now playing: **${track.title}** (requested by ${track.requestedBy})`);

  } catch (err) {
    console.error('Failed to play track:', err);
    q.textChannel?.send(`⚠️ Couldn't play **${track.title}**, skipping.`);
    cleanupTrackFile(q, track);
    q.current = null;
    q.playing = false;
    if (q.closed) return;
    playNext(guildId);
  }
}

export async function enqueueAndPlay(guild, voiceChannel, textChannel, track) {
  const q = getQueue(guild.id);
  if (!q.canAdd()) return false;
  ensureConnection(guild, voiceChannel, textChannel);
  
  // 👇 Cancel the inactivity timer because a new song was added
  if (q.inactiveTimeout) {
    clearTimeout(q.inactiveTimeout);
    q.inactiveTimeout = null;
    console.log(`♻️ Cancelled inactive timer for guild ${guild.id}.`);
  }

  if (!q.add(track)) return false;
  if (!q.playing) {
    q.playing = true;
    void playNext(guild.id);
  } else {
    textChannel.send(`➕ Added to queue: **${track.title}**`);
  }
  return true;
}

export async function enqueueManyAndPlay(guild, voiceChannel, textChannel, tracks) {
  const q = getQueue(guild.id);
  if (!q.canAdd(tracks.length)) return false;
  ensureConnection(guild, voiceChannel, textChannel);
  
  // 👇 Cancel the inactivity timer because new songs were added
  if (q.inactiveTimeout) {
    clearTimeout(q.inactiveTimeout);
    q.inactiveTimeout = null;
    console.log(`♻️ Cancelled inactive timer for guild ${guild.id}.`);
  }

  if (!q.addMany(tracks)) return false;
  if (!q.playing) {
    q.playing = true;
    void playNext(guild.id);
  }
  return true;
}

export function skipTrack(guildId) {
  const q = getQueue(guildId);
  if (!q.player) return false;
  return q.player.stop();
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
  
  // 👇 Clear the timer if the bot is leaving manually
  if (q.inactiveTimeout) {
    clearTimeout(q.inactiveTimeout);
    q.inactiveTimeout = null;
  }
  
  for (const track of q.clear()) cleanupTrackFile(q, track);
  q.closed = true;
  
  updateBotPresence(q.client, null);
  
  const stopped = q.player?.stop() ?? false;
  if (!stopped) {
    cleanupTrackFile(q, q.current);
    q.current = null;
  }
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
      stopAndLeave(guildId);
    }
  });
}