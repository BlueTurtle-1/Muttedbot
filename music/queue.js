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
  }

  add(track) {
    this.tracks.push(track);
  }

  next() {
    this.current = this.tracks.shift() || null;
    return this.current;
  }

  clear() {
    this.tracks = [];
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