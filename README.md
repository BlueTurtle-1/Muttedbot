Install

```git clone```

Make .env file and paste in Discord bot token

```
DISCORD_TOKEN=
CLIENT_ID=
GUILD_ID=
STT_SERVICE_URL=http://localhost:8000/transcribe
WAKE_WORD=hey mutted bot
DEFAULT_VOLUME=50
AUTO_LEAVE_MS=300000
MAX_UPLOAD_BYTES=20971520
UPLOAD_COOLDOWN_MS=15000
MAX_CONCURRENT_UPLOADS_PER_GUILD=1
MAX_QUEUED_UPLOADS_PER_GUILD=10
MAX_QUEUED_UPLOAD_BYTES_PER_GUILD=104857600
MAX_TEMP_UPLOAD_FILES=20
MAX_TEMP_UPLOAD_BYTES=209715200
MAX_QUEUE_TRACKS_PER_GUILD=50
PLAY_BLACKLIST_WORDS=sex,sexual,porn,pornography,hentai,erotic,nude,nudity,naked,lingerie,transparent lingerie,onlyfans,bikini haul,micro bikini,sexy,asmr
```

Upload limits default to 20 MiB per file, a 15-second per-user cooldown, one concurrent upload per guild, and bounded per-guild queue and temporary storage. The music queue accepts up to 50 pending tracks per guild across uploads, links, searches, and playlists. Values are in bytes or milliseconds as indicated by their names.

`PLAY_BLACKLIST_WORDS` is a comma-separated list checked against song and artist input for `/play`, plus video titles from `/link` YouTube URLs and playlists. Matching is case-insensitive, ignores punctuation differences, and requires whole words or phrases. If omitted, the starter list shown above is used; set it to an empty value to disable the filter.

For an agent-oriented explanation of how the code and dependencies work, see [Muttedbot/docs.md](./docs.md).

Start Command

```npm start```
