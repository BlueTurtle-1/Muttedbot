// Simple per-guild music queue manager
class GuildQueue {
  constructor(guildId) {
    this.guildId = guildId;
    this.tracks = [];       // { title, url, requestedBy }
    this.current = null;
    this.volume = 50;
    this.playing = false;
    this.connection = null;
    this.player = null;
    this.textChannel = null;
    this.uploadCount = 0;
    this.uploadBytes = 0;
    this.closed = false;
  }

  add(track) {
    this.tracks.push(track);
    if (track.filePath) {
      this.uploadCount++;
      this.uploadBytes += track.fileSize || 0;
    }
  }

  releaseUpload(track) {
    if (!track?.filePath || track.uploadReleased) return;
    track.uploadReleased = true;
    this.uploadCount = Math.max(0, this.uploadCount - 1);
    this.uploadBytes = Math.max(0, this.uploadBytes - (track.fileSize || 0));
  }

  next() {
    this.current = this.tracks.shift() || null;
    return this.current;
  }

  clear() {
    return this.tracks.splice(0);
  }
}

const queues = new Map();

export function getQueue(guildId) {
  if (!queues.has(guildId)) {
    queues.set(guildId, new GuildQueue(guildId));
  }
  return queues.get(guildId);
}

export function deleteQueue(guildId) {
  queues.delete(guildId);
}

export function getUploadUsage() {
  let count = 0;
  let bytes = 0;
  for (const queue of queues.values()) {
    count += queue.uploadCount;
    bytes += queue.uploadBytes;
  }
  return { count, bytes };
}