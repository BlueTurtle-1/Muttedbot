# MuttedBot code guide

This guide describes the current implementation to help agents find the right
entry point before changing behavior. The bot is a Node.js ES-module Discord
music bot. Its main flow is: load configuration, discover slash-command and
event modules, keep one in-memory queue per Discord guild, and use Discord's
voice player to play queued audio.

## Project map

| Path | Responsibility |
| --- | --- |
| `index.js` | Creates the Discord client, dynamically loads commands and events, attaches the client to guild queues, and logs in. |
| `config.js` | Loads `.env` and exports parsed settings and defaults used by the app. |
| `deploy-commands.js` | Converts command definitions to Discord API payloads and registers them as guild or global slash commands. |
| `commands/` | One module per slash command. Each exports a `data` command definition and an `execute(interaction)` handler. |
| `events/interactionCreate.js` | Dispatches chat-input interactions to the matching command and handles command errors. |
| `events/ready.js` | Logs the bot identity after the Discord client is ready. |
| `music/queue.js` | Defines the per-guild queue state and queue/upload accounting helpers. |
| `music/player.js` | Owns voice connections and audio players, starts/stops tracks, advances queues, cleans uploaded files, and handles inactivity/disconnection. |
| `music/search.js` | Searches YouTube for one result and normalizes it into the track shape used by the queue. |
| `music/blacklist.js` | Normalizes text and checks it against configured blocked terms. |
| `voice/` | Currently contains no implementation; the speech-to-text and wake-word settings are not wired into a voice interaction flow. |
| `temp/` | Runtime storage for downloaded attachment tracks. Files are created here as UUID-named `.upload` files and removed after playback or when discarded. |

The standard track object contains a `title`, `requestedBy`, and either a YouTube
`url` or an uploaded-file `filePath`. Uploaded tracks also carry `fileSize` so
the queue can account for their temporary storage.

## Startup and slash commands

1. `npm start` runs `index.js` with IPv4-first DNS ordering and a larger HTTP
   header limit.
2. Importing `config.js` loads `.env` through `dotenv/config`. The client logs
   into Discord with `DISCORD_TOKEN`.
3. `index.js` scans `commands/` and imports each JavaScript module. The exported
   command is stored in `client.commands` by `data.name`.
4. It scans `events/` and registers each handler with `client.on` or
   `client.once`, depending on the module's `once` export.
5. On ready, the bot logs in `events/ready.js` and creates/attaches a queue for
   each guild cached by the client.
6. `events/interactionCreate.js` ignores non-chat-input interactions, finds the
   command by name, and calls its `execute` function. Errors are logged and
   returned to the user as an ephemeral response.

Run `npm run deploy` after adding or changing slash-command definitions. It
imports the command modules again and registers their serialized definitions.
If `GUILD_ID` is set, deployment is guild-scoped and takes effect quickly;
otherwise it deploys global commands, which can take time to appear.

## Music queue and playback flow

`music/queue.js` stores queues in a process-local `Map`, keyed by guild ID.
Each queue owns its pending `tracks`, current track, player/connection, text
channel, volume, upload usage counters, and inactive/closed state. State is
not persisted: restarting the bot loses the queue. `availableSlots` and
`canAdd()` enforce `MAX_QUEUE_TRACKS_PER_GUILD` against pending tracks; the
currently playing track is not counted as a pending slot.

For `/play`, `music/search.js` uses `play-dl` to find the first YouTube video and
returns the normalized track. `/link` can enqueue a video or playlist directly.
`music/player.js` then:

1. Creates a voice connection and audio player if the guild does not already
   have them, and subscribes the player to the connection.
2. Pulls the next item from the queue.
3. Waits for the voice connection to be ready.
4. Creates an audio resource from either the local uploaded file or a
   `ytdl-core` YouTube audio stream, applies the guild volume, and starts the
   player.
5. On the player's idle event, cleans up any uploaded file and starts the next
   track. Playback errors are logged, reported in the text channel, and the
   failed track is skipped.

`/skip` stops the player, which makes the normal idle handler advance the
queue. `/pause` and `/resume` pause and unpause the player. `/stop` clears
pending tracks and stops playback but keeps the bot's connection; `/leave`
stops, clears, destroys the connection, and removes the guild queue. `/join`
connects to the member's voice channel, moving from a different channel if
necessary.

When the queue empties, the player starts a ten-minute timer and then leaves.
Although `AUTO_LEAVE_MS` is parsed by `config.js`, the current player uses a
hard-coded ten minutes instead of that setting. `DEFAULT_VOLUME` is applied
when the connection is first created for a guild.

## `/link`: URLs and attachment uploads

The URL path accepts only HTTP(S) YouTube hostnames. Playlist URLs are fetched
with `play-dl`, limited to available queue slots, and titles matching the
blacklist are skipped. A single video title is fetched and checked before it
is enqueued.

The attachment path only accepts audio or video content types. It applies the
per-file size limit, per-user cooldown, per-guild active-upload and queued
upload limits, plus global temporary-storage count and byte limits. Downloads
are streamed into `temp/` with a size cap and checked against Discord's
attachment size metadata before queuing. Upload reservations prevent concurrent
downloads from oversubscribing those limits. Once a queued upload has played,
been skipped/stopped, or failed, the player attempts to remove its temporary
file and release its queue accounting.

## Content filter

`music/blacklist.js` normalizes text with Unicode NFKC, lowercases it, and
converts punctuation runs to spaces. It checks whole words or phrases from
`PLAY_BLACKLIST_WORDS`, so punctuation differences do not evade a match.
`/play` checks the combined song/artist query; `/link` checks video or playlist
titles. `/insert` currently does not call this filter.

## Configuration

`config.js` parses these environment variables. Defaults below match the current
code, not necessarily every example value that may be present in a local
`.env`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DISCORD_TOKEN` | none | Discord bot token; required to log in. |
| `CLIENT_ID` | none | Discord application ID used by `npm run deploy`. |
| `GUILD_ID` | `null` | Optional guild for fast, guild-scoped command deployment. |
| `STT_SERVICE_URL` | `http://localhost:8000/transcribe` | Speech-to-text service URL setting; currently not used by runtime code. |
| `WAKE_WORD` | `hey mutted bot` | Wake-word setting, lowercased at load time; currently not used by runtime code. |
| `DEFAULT_VOLUME` | `50` | Initial playback volume percentage for a guild. |
| `AUTO_LEAVE_MS` | `300000` | Parsed setting, but currently unused; actual auto-leave delay is hard-coded to ten minutes. |
| `MAX_UPLOAD_BYTES` | `20971520` (20 MiB) | Maximum size of one attachment upload. |
| `UPLOAD_COOLDOWN_MS` | `15000` | Per-user delay between attachment uploads. |
| `MAX_CONCURRENT_UPLOADS_PER_GUILD` | `1` | Maximum simultaneous attachment downloads per guild. |
| `MAX_QUEUED_UPLOADS_PER_GUILD` | `10` | Maximum uploaded tracks currently owned by a guild queue, plus in-progress upload reservations. |
| `MAX_QUEUED_UPLOAD_BYTES_PER_GUILD` | `104857600` (100 MiB) | Maximum upload bytes currently owned by a guild queue, plus in-progress upload reservations. |
| `MAX_TEMP_UPLOAD_FILES` | `20` | Global limit for tracked/reserved temporary upload files. |
| `MAX_TEMP_UPLOAD_BYTES` | `209715200` (200 MiB) | Global limit for tracked/reserved temporary upload bytes. |
| `MAX_QUEUE_TRACKS_PER_GUILD` | `50` | Maximum pending tracks per guild across sources. |
| `PLAY_BLACKLIST_WORDS` | Starter list in `config.js` | Comma-separated blocked words/phrases. An explicitly empty value disables the filter. |

Positive integer settings use their fallback if the value is invalid or not a
positive safe integer. `DEFAULT_VOLUME` is converted directly to a number.

## Slash commands

| Command | Behavior |
| --- | --- |
| `/join` | Join the invoking member's voice channel. |
| `/leave` | Stop playback, clear the queue, and leave voice. |
| `/play song [artist]` | Search YouTube and queue the first result; checks the search text against the blacklist. |
| `/insert song [artist]` | Add a searched result at the front of the pending queue. |
| `/link [url] [file]` | Queue a YouTube video/playlist or download an audio/video attachment. Provide one input, not both. |
| `/queue` | Show the current track and pending tracks. |
| `/nowplaying` | Show the current track and requester. |
| `/pause` | Pause playback. |
| `/resume` | Resume paused playback. |
| `/skip` | Stop the current track so the next one starts. |
| `/stop` | Stop playback and clear pending tracks without leaving voice. |

## Runtime dependencies (`package.json`)

These are the project's direct npm dependencies. npm also installs transitive
dependencies for them; those are not individually imported or managed by this
application.

| Package | Role |
| --- | --- |
| `discord.js` | Discord API client, gateway events, slash-command builders, and REST command deployment. |
| `@discordjs/voice` | Discord voice connections, audio players/resources, and voice connection state management. |
| `@distube/ytdl-core` | Retrieves YouTube video information and provides audio download streams. |
| `@iamtraction/play-dl` | Searches YouTube and fetches playlist information. |
| `@discordjs/opus` | Native Opus codec provider for encoding/decoding voice audio. |
| `opusscript` | JavaScript Opus codec provider available as an alternative when a native provider is unavailable. |
| `@snazzah/davey` | Voice-stack support for Discord's voice encryption/protocol requirements. |
| `libsodium-wrappers` | JavaScript cryptographic primitives used by Discord voice encryption support. |
| `ffmpeg-static` | Supplies a platform-specific FFmpeg executable for media-processing paths that require FFmpeg. The app does not invoke it directly in its current source. |
| `dotenv` | Loads environment variables from `.env` when `config.js` is imported. |

## Notes for future changes

- Keep command definitions and handlers together in `commands/`; the loader
  expects each command module to export `data` and `execute`.
- Add event modules under `events/` with `name`, `execute`, and optional
  `once` exports.
- Use `getQueue(guildId)` rather than creating independent queue state, and
  preserve queue capacity and uploaded-file accounting when adding tracks.
- Keep cleanup paths in `music/player.js` and `commands/link.js` in sync when
  changing uploaded-track lifecycle behavior.
- The STT configuration and `voice/` directory are currently scaffolding only;
  connecting voice capture or transcription will need an actual event/listener
  flow rather than only changing the environment variables.
