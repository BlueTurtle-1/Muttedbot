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
```

Upload limits default to 20 MiB per file, a 15-second per-user cooldown, one concurrent upload per guild, and bounded per-guild queue and temporary storage. Values are in bytes or milliseconds as indicated by their names.

Start Command

```npm start```
